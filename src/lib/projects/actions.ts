"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/guards";
import { requireProjectWriteAccess } from "@/lib/projects/permissions";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/auth/types";

const WRITE_ROLES: UserRole[] = ["super_admin", "ingeniero"];

const VALID_STATUSES = [
  "planeacion",
  "en_progreso",
  "en_pausa",
  "completado",
  "cancelado",
] as const;

export async function createProjectAction(formData: FormData) {
  const currentProfile = await requireAnyRole(WRITE_ROLES);

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const clientId = formData.get("clientId") as string;
  const engineerId = formData.get("engineerId") as string;
  const startDate = formData.get("startDate") as string;
  const estimatedEndDate = formData.get("estimatedEndDate") as string;

  if (!name || !clientId || !engineerId) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client || client.deletedAt) {
    return redirect("/dashboard/projects?error=client-not-found");
  }

  const engineer = await prisma.user.findUnique({
    where: { id: engineerId },
  });

  if (!engineer || engineer.deletedAt) {
    return redirect("/dashboard/projects?error=engineer-not-found");
  }

  if (!engineer.active) {
    return redirect("/dashboard/projects?error=engineer-inactive");
  }

  if (engineer.role !== "ingeniero") {
    return redirect("/dashboard/projects?error=invalid-engineer-role");
  }

  if (startDate && estimatedEndDate && new Date(estimatedEndDate) < new Date(startDate)) {
    return redirect("/dashboard/projects?error=invalid-dates");
  }

  // Transaccion: obra + asignacion + historial inicial
  await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name,
        description: description || null,
        clientId,
        createdBy: currentProfile.id,
        updatedBy: currentProfile.id,
        startDate: startDate ? new Date(startDate) : null,
        estimatedEndDate: estimatedEndDate
          ? new Date(estimatedEndDate)
          : null,
        currentStatus: "planeacion",
        currentProgress: 0,
      },
    });

    await tx.projectAssignment.create({
      data: {
        projectId: project.id,
        userId: engineerId,
        role: "ingeniero",
        isPrincipal: true,
      },
    });

    // Registrar historial inicial (estado planeacion, progreso 0)
    await tx.projectStatusHistory.create({
      data: {
        projectId: project.id,
        previousStatus: null,
        newStatus: "planeacion",
        previousProgress: null,
        newProgress: 0,
        changedBy: currentProfile.id,
        observation: "Obra creada",
      },
    });
  });

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects?created=true");
}

export async function updateProjectAction(formData: FormData) {
  const currentProfile = await requireAnyRole(WRITE_ROLES);

  const projectId = formData.get("projectId") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const progressStr = formData.get("progress") as string;
  const status = formData.get("status") as string;
  const startDateStr = formData.get("startDate") as string;
  const estimatedEndDateStr = formData.get("estimatedEndDate") as string;

  if (!projectId || !name) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.deletedAt) {
    return redirect("/dashboard/projects?error=project-not-found");
  }

  // Validar acceso de escritura por asignacion (ingeniero solo si esta asignado)
  await requireProjectWriteAccess(currentProfile, projectId);

  // Capturar estado anterior
  const oldStatus = project.currentStatus;
  const oldProgress = project.currentProgress;

  // Validar progreso
  let progress = project.currentProgress;
  if (progressStr) {
    const parsed = parseInt(progressStr, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      return redirect("/dashboard/projects?error=invalid-progress");
    }
    progress = parsed;
  }

  // Validar estado
  let newStatus = status || project.currentStatus;
  if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return redirect("/dashboard/projects?error=invalid-status");
  }

  // Regla: progreso 100 → completado
  if (progress === 100) {
    newStatus = "completado";
  }

  // Validar fechas: end >= start
  const resolvedStartDate = startDateStr ? new Date(startDateStr) : project.startDate;
  const resolvedEndDate = estimatedEndDateStr ? new Date(estimatedEndDateStr) : project.estimatedEndDate;
  if (resolvedStartDate && resolvedEndDate && resolvedEndDate < resolvedStartDate) {
    return redirect("/dashboard/projects?error=invalid-dates");
  }

  // Regla: completado o cancelado → archivar
  const shouldArchive =
    newStatus === "completado" || newStatus === "cancelado";
  const archivedAt =
    shouldArchive && !project.archivedAt ? new Date() : project.archivedAt;

  // Detectar si cambio estado o progreso
  const statusChanged = newStatus !== oldStatus;
  const progressChanged = progress !== oldProgress;
  const hasRelevantChange = statusChanged || progressChanged;

  // Transaccion: actualizar obra + historial si hay cambio
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        name,
        description: description || null,
        currentProgress: progress,
        currentStatus: newStatus as typeof project.currentStatus,
        startDate: startDateStr
          ? new Date(startDateStr)
          : project.startDate,
        estimatedEndDate: estimatedEndDateStr
          ? new Date(estimatedEndDateStr)
          : project.estimatedEndDate,
        archivedAt,
        updatedBy: currentProfile.id,
      },
    });

    if (hasRelevantChange) {
      await tx.projectStatusHistory.create({
        data: {
          projectId,
          previousStatus: statusChanged ? oldStatus : null,
          newStatus: statusChanged ? (newStatus as typeof project.currentStatus) : null,
          previousProgress: progressChanged ? oldProgress : null,
          newProgress: progressChanged ? progress : null,
          changedBy: currentProfile.id,
        },
      });
    }
  });

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects?updated=true");
}

export async function archiveProjectAction(formData: FormData) {
  const currentProfile = await requireAnyRole(WRITE_ROLES);

  const projectId = formData.get("projectId") as string;

  if (!projectId) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.deletedAt) {
    return redirect("/dashboard/projects?error=project-not-found");
  }

  // Validar acceso de escritura por asignacion
  await requireProjectWriteAccess(currentProfile, projectId);

  const oldStatus = project.currentStatus;
  const oldProgress = project.currentProgress;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        archivedAt: project.archivedAt ?? new Date(),
      },
    });

    await tx.projectStatusHistory.create({
      data: {
        projectId,
        previousStatus: oldStatus,
        newStatus: oldStatus,
        previousProgress: oldProgress,
        newProgress: oldProgress,
        changedBy: currentProfile.id,
        observation: "Obra archivada (soft delete)",
      },
    });
  });

  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects?archived=true");
}
