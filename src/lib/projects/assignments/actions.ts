"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { requireAnyRole, requireSuperAdmin } from "@/lib/auth/guards";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isPrimaryEngineer } from "@/lib/projects/assignments/queries";

const ASSIGNABLE_ROLES = ["ingeniero", "marketing"] as const;

function isValidAssignmentRole(
  role: string,
): role is typeof ASSIGNABLE_ROLES[number] {
  return ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number]);
}

export async function assignUserToProjectAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const projectId = formData.get("projectId") as string;
  const userId = formData.get("userId") as string;
  const assignmentRole = formData.get("assignmentRole") as string;

  if (!projectId || !userId || !assignmentRole) {
    return redirect(
      `/dashboard/projects/${projectId}?error=missing-fields`,
    );
  }

  if (!isValidAssignmentRole(assignmentRole)) {
    return redirect(
      `/dashboard/projects/${projectId}?error=invalid-role`,
    );
  }

  // Validar obra existe y no eliminada
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || project.deletedAt) {
    notFound();
  }

  // Validar usuario a asignar
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || !user.active) {
    return redirect(
      `/dashboard/projects/${projectId}?error=user-not-found`,
    );
  }

  // Rol del usuario debe coincidir con rol de asignacion
  // (esto tambien excluye super_admin y cliente implicitamente
  //  porque solo se pueden asignar roles ingeniero o marketing)
  if (user.role !== assignmentRole) {
    return redirect(
      `/dashboard/projects/${projectId}?error=role-mismatch`,
    );
  }

  // Validar permisos del actor
  const isSuperAdmin = profile.role === "super_admin";
  const isPrincipalEng =
    profile.role === "ingeniero" &&
    (await isPrimaryEngineer(projectId, profile.id));

  // super_admin: puede asignar ingeniero y marketing
  // ingeniero principal: solo puede asignar marketing
  if (!isSuperAdmin) {
    if (!isPrincipalEng) {
      return redirect(
        `/dashboard/projects/${projectId}?error=not-authorized`,
      );
    }
    if (assignmentRole !== "marketing") {
      return redirect(
        `/dashboard/projects/${projectId}?error=cannot-assign-engineer`,
      );
    }
  }

  // Verificar si ya existe asignacion activa
  const existing = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId,
      unassignedAt: null,
    },
  });

  if (existing) {
    return redirect(
      `/dashboard/projects/${projectId}?error=already-assigned`,
    );
  }

  // Buscar asignacion previa desasignada para reactivar
  const previous = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId,
      unassignedAt: { not: null },
    },
    orderBy: { unassignedAt: "desc" },
  });

  if (previous) {
    // Reactivar asignacion
    await prisma.projectAssignment.update({
      where: { id: previous.id },
      data: {
        unassignedAt: null,
        assignedAt: new Date(),
      },
    });
  } else {
    // Crear nueva asignacion
    await prisma.projectAssignment.create({
      data: {
        projectId,
        userId,
        role: assignmentRole as "ingeniero" | "marketing",
        isPrincipal: false,
      },
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?assigned=true`);
}

export async function unassignUserFromProjectAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const projectId = formData.get("projectId") as string;
  const assignmentId = formData.get("assignmentId") as string;

  if (!projectId || !assignmentId) {
    return redirect(
      `/dashboard/projects/${projectId}?error=missing-fields`,
    );
  }

  const assignment = await prisma.projectAssignment.findUnique({
    where: { id: assignmentId },
    include: { user: true },
  });

  if (!assignment || assignment.unassignedAt) {
    return redirect(
      `/dashboard/projects/${projectId}?error=assignment-not-found`,
    );
  }

  // Validar permisos del actor
  const isSuperAdmin = profile.role === "super_admin";
  const isPrincipalEng =
    profile.role === "ingeniero" &&
    (await isPrimaryEngineer(projectId, profile.id));

  if (!isSuperAdmin && !isPrincipalEng) {
    return redirect(
      `/dashboard/projects/${projectId}?error=not-authorized`,
    );
  }

  // super_admin puede desasignar cualquier ingeniero o marketing
  // ingeniero principal solo puede desasignar marketing
  if (!isSuperAdmin && assignment.role !== "marketing") {
    return redirect(
      `/dashboard/projects/${projectId}?error=cannot-unassign-engineer`,
    );
  }

  // No permitir auto-desasignacion del ingeniero principal
  if (
    assignment.userId === profile.id &&
    assignment.isPrincipal
  ) {
    return redirect(
      `/dashboard/projects/${projectId}?error=cannot-unassign-self`,
    );
  }

  // No permitir desasignar al unico ingeniero principal
  if (assignment.isPrincipal) {
    const principalCount =
      await prisma.projectAssignment.count({
        where: {
          projectId,
          role: "ingeniero",
          isPrincipal: true,
          unassignedAt: null,
          id: { not: assignmentId },
        },
      });

    if (principalCount === 0) {
      return redirect(
        `/dashboard/projects/${projectId}?error=cannot-remove-last-principal`,
      );
    }
  }

  // Soft unassign: marcar desasignado_en
  await prisma.projectAssignment.update({
    where: { id: assignmentId },
    data: { unassignedAt: new Date() },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?unassigned=true`);
}

export async function setPrimaryEngineerAction(formData: FormData) {
  await requireSuperAdmin();

  const projectId = formData.get("projectId") as string;
  const newPrimaryId = formData.get("assignmentId") as string;

  if (!projectId || !newPrimaryId) {
    return redirect(
      `/dashboard/projects/${projectId}?error=missing-fields`,
    );
  }

  const assignment = await prisma.projectAssignment.findUnique({
    where: { id: newPrimaryId },
  });

  if (!assignment || assignment.unassignedAt) {
    return redirect(
      `/dashboard/projects/${projectId}?error=assignment-not-found`,
    );
  }

  if (assignment.role !== "ingeniero") {
    return redirect(
      `/dashboard/projects/${projectId}?error=not-an-engineer`,
    );
  }

  // Transaccion: quitar principal actual + asignar nuevo
  await prisma.$transaction(async (tx) => {
    // Quitar principal a todos los ingenieros actuales
    await tx.projectAssignment.updateMany({
      where: {
        projectId,
        role: "ingeniero",
        isPrincipal: true,
        unassignedAt: null,
      },
      data: { isPrincipal: false },
    });

    // Asignar principal al nuevo
    await tx.projectAssignment.update({
      where: { id: newPrimaryId },
      data: { isPrincipal: true },
    });
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?primary-changed=true`);
}
