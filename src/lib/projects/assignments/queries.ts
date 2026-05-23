import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Lista todas las asignaciones activas (no desasignadas) de una obra,
 * incluyendo datos del usuario asignado.
 */
export async function listProjectAssignments(projectId: string) {
  return prisma.projectAssignment.findMany({
    where: {
      projectId,
      unassignedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      },
    },
    orderBy: {
      assignedAt: "asc",
    },
  });
}

/**
 * Lista usuarios internos activos disponibles para ser asignados
 * a una obra. Filtra por rol si se especifica. Excluye clientes
 * y super_admin por defecto.
 */
export async function listAssignableUsers(
  projectId: string,
  role?: "ingeniero" | "marketing",
) {
  // Obtener usuarios ya asignados activamente a esta obra
  const assignedUserIds = (
    await prisma.projectAssignment.findMany({
      where: {
        projectId,
        unassignedAt: null,
      },
      select: { userId: true },
    })
  ).map((a) => a.userId);

  const where: Record<string, unknown> = {
    active: true,
    deletedAt: null,
    role: role ?? { in: ["ingeniero", "marketing"] },
    id: { notIn: assignedUserIds },
  };

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

/**
 * Obtiene el ingeniero principal activo de una obra.
 */
export async function getPrimaryEngineer(projectId: string) {
  return prisma.projectAssignment.findFirst({
    where: {
      projectId,
      role: "ingeniero",
      isPrincipal: true,
      unassignedAt: null,
    },
  });
}

/**
 * Cuenta cuantos ingenieros principales activos tiene una obra.
 */
export async function countActivePrimaryEngineers(
  projectId: string,
): Promise<number> {
  return prisma.projectAssignment.count({
    where: {
      projectId,
      role: "ingeniero",
      isPrincipal: true,
      unassignedAt: null,
    },
  });
}

/**
 * Verifica si un usuario es el ingeniero principal de una obra.
 */
export async function isPrimaryEngineer(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId,
      role: "ingeniero",
      isPrincipal: true,
      unassignedAt: null,
    },
  });

  return assignment !== null;
}
