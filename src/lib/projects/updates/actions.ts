"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  canCreateProjectUpdate,
  canEditProjectUpdate,
  canDeleteProjectUpdate,
} from "@/lib/projects/updates/queries";
import { uploadSingleUpdateFile } from "@/lib/projects/updates/files/actions";

const VALID_STATUSES = [
  "planeacion",
  "en_progreso",
  "en_pausa",
  "completado",
  "cancelado",
] as const;

export async function createProjectUpdateAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const statusStr = formData.get("resultingStatus") as string;
  const progressStr = formData.get("resultingProgress") as string;

  if (!projectId || !title) {
    return redirect(
      `/dashboard/projects/${projectId}?error=missing-fields`,
    );
  }

  // Validar obra
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.deletedAt) {
    return redirect(
      `/dashboard/projects/${projectId}?error=project-not-found`,
    );
  }

  // Validar permiso de creacion
  if (!(await canCreateProjectUpdate(profile, projectId))) {
    return redirect(
      `/dashboard/projects/${projectId}?error=not-authorized`,
    );
  }

  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  const normalizedDescription = description
    ? description.trim().replace(/\s+/g, " ")
    : null;
  const tenSecondsAgo = new Date(Date.now() - 10_000);

  const recentDuplicate = await prisma.projectUpdate.findFirst({
    where: {
      projectId,
      authorId: profile.id,
      title: normalizedTitle,
      description: normalizedDescription,
      deletedAt: null,
      createdAt: { gt: tenSecondsAgo },
    },
    select: { id: true },
  });

  if (recentDuplicate) {
    revalidatePath(`/dashboard/projects/${projectId}`);
    redirect(`/dashboard/projects/${projectId}?update-created=true`);
  }

  // Validar estado opcional
  let newStatus:
    | (typeof VALID_STATUSES)[number]
    | undefined;
  if (statusStr) {
    if (!VALID_STATUSES.includes(statusStr as (typeof VALID_STATUSES)[number])) {
      return redirect(
        `/dashboard/projects/${projectId}?error=invalid-status`,
      );
    }
    newStatus = statusStr as (typeof VALID_STATUSES)[number];
  }

  // Validar progreso opcional
  let newProgress: number | undefined;
  if (progressStr) {
    const parsed = parseInt(progressStr, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      return redirect(
        `/dashboard/projects/${projectId}?error=invalid-progress`,
      );
    }
    newProgress = parsed;
  }

  // Regla: progreso 100 → completado
  if (newProgress === 100) {
    newStatus = "completado";
  }

  // Detectar si cambia estado o progreso
  const statusChanged =
    newStatus !== undefined && newStatus !== project.currentStatus;
  const progressChanged =
    newProgress !== undefined && newProgress !== project.currentProgress;

  // Transaccion: update + historial + archivar si aplica
  const shouldArchive =
    newStatus === "completado" || newStatus === "cancelado";

  let createdUpdateId: string;

  await prisma.$transaction(async (tx) => {
    // Crear actualizacion
    const update = await tx.projectUpdate.create({
      data: {
        projectId,
        authorId: profile.id,
        title,
        description: description || null,
        resultingStatus: newStatus ?? null,
        resultingProgress: newProgress ?? null,
      },
    });
    createdUpdateId = update.id;

    // Cambiar estado/progreso de la obra si aplica
    if (statusChanged || progressChanged) {
      const updateData: Record<string, unknown> = {};

      if (statusChanged && newStatus) {
        updateData.currentStatus = newStatus;
      }
      if (progressChanged && newProgress !== undefined) {
        updateData.currentProgress = newProgress;
      }
      if (shouldArchive && !project.archivedAt) {
        updateData.archivedAt = new Date();
      }

      if (Object.keys(updateData).length > 0) {
        await tx.project.update({
          where: { id: projectId },
          data: updateData,
        });
      }

      // Crear historial
      await tx.projectStatusHistory.create({
        data: {
          projectId,
          previousStatus: statusChanged
            ? project.currentStatus
            : null,
          newStatus: statusChanged ? (newStatus ?? null) : null,
          previousProgress: progressChanged
            ? project.currentProgress
            : null,
          newProgress: progressChanged ? (newProgress ?? null) : null,
          changedBy: profile.id,
          relatedUpdateId: update.id,
        },
      });
    }
  });

  const files = formData.getAll("files") as File[];
  const fileErrors: string[] = [];
  let videoCount = 0;

  for (const file of files) {
    if (!file || typeof file === "string" || file.size === 0) continue;

    const result = await uploadSingleUpdateFile(
      file,
      createdUpdateId!,
      projectId,
      profile.id,
    );

    if (!result.ok) {
      fileErrors.push(result.error ?? "upload-failed");
    }

    if (file.type.startsWith("video/")) {
      videoCount++;
      if (videoCount > 1) {
        fileErrors.push("video-limit-reached");
      }
    }
  }

  revalidatePath(`/dashboard/projects/${projectId}`);

  if (fileErrors.length > 0) {
    redirect(
      `/dashboard/projects/${projectId}?update-created=true&file-error=${encodeURIComponent(fileErrors.join(", "))}`,
    );
  }

  redirect(`/dashboard/projects/${projectId}?update-created=true`);
}

export async function updateProjectUpdateAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const updateId = formData.get("updateId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!updateId || !title) {
    return redirect(
      `/dashboard/projects?error=missing-fields`,
    );
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: { id: true, projectId: true, deletedAt: true },
  });

  if (!update || update.deletedAt) {
    return redirect(
      `/dashboard/projects?error=update-not-found`,
    );
  }

  if (!(await canEditProjectUpdate(profile, updateId))) {
    return redirect(
      `/dashboard/projects/${update.projectId}?error=not-authorized`,
    );
  }

  await prisma.projectUpdate.update({
    where: { id: updateId },
    data: {
      title,
      description: description || null,
      editedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/projects/${update.projectId}`);
  redirect(`/dashboard/projects/${update.projectId}?update-edited=true`);
}

export async function deleteProjectUpdateAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const updateId = formData.get("updateId") as string;

  if (!updateId) {
    return redirect(
      `/dashboard/projects?error=missing-fields`,
    );
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: {
      id: true,
      projectId: true,
      deletedAt: true,
      resultingStatus: true,
      resultingProgress: true,
    },
  });

  if (!update || update.deletedAt) {
    return redirect(
      `/dashboard/projects?error=update-not-found`,
    );
  }

  if (!(await canDeleteProjectUpdate(profile, updateId))) {
    return redirect(
      `/dashboard/projects/${update.projectId}?error=not-authorized`,
    );
  }

  const hadChange =
    update.resultingProgress !== null || update.resultingStatus !== null;

  // Transaccion: soft-delete + revertir progreso/estado + historial
  await prisma.$transaction(async (tx) => {
    await tx.projectUpdate.update({
      where: { id: updateId },
      data: { deletedAt: new Date() },
    });

    if (hadChange) {
      const project = await tx.project.findUnique({
        where: { id: update.projectId },
        select: { currentStatus: true, currentProgress: true },
      });
      if (!project) return;

      const historyEntry = await tx.projectStatusHistory.findFirst({
        where: { relatedUpdateId: updateId },
        orderBy: { createdAt: "desc" },
        select: { previousStatus: true, previousProgress: true },
      });

      if (historyEntry) {
        const newStatus = historyEntry.previousStatus ?? project.currentStatus;
        const newProgress =
          historyEntry.previousProgress ?? project.currentProgress;

        await tx.project.update({
          where: { id: update.projectId },
          data: { currentStatus: newStatus, currentProgress: newProgress },
        });

        await tx.projectStatusHistory.create({
          data: {
            projectId: update.projectId,
            previousStatus: project.currentStatus,
            newStatus,
            previousProgress: project.currentProgress,
            newProgress,
            changedBy: profile.id,
            observation: "Actualizacion eliminada — progreso revertido",
          },
        });
      }
    }
  });

  revalidatePath(`/dashboard/projects/${update.projectId}`);
  redirect(`/dashboard/projects/${update.projectId}?update-deleted=true`);
}
