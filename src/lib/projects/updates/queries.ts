import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrismaUser } from "@/lib/auth/types";

/**
 * Lista las actualizaciones activas (no eliminadas) de una obra,
 * incluyendo autor y archivos. Orden por fecha descendente.
 */
export async function listProjectUpdates(projectId: string) {
  return prisma.projectUpdate.findMany({
    where: {
      projectId,
      deletedAt: null,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      files: {
        select: {
          id: true,
          fileType: true,
          url: true,
          fileName: true,
          size: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Obtiene una actualizacion por ID con autor y archivos.
 */
export async function getProjectUpdateById(updateId: string) {
  return prisma.projectUpdate.findUnique({
    where: { id: updateId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      files: true,
    },
  });
}

/**
 * Verifica si un usuario puede crear actualizaciones en una obra.
 * Solo ingeniero o marketing con asignacion activa.
 * super_admin no puede segun LORE.md.
 */
export async function canCreateProjectUpdate(
  profile: PrismaUser,
  projectId: string,
): Promise<boolean> {
  if (profile.role !== "ingeniero" && profile.role !== "marketing") {
    return false;
  }

  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId: profile.id,
      unassignedAt: null,
    },
  });

  return assignment !== null;
}

/**
 * Verifica si un usuario puede editar una actualizacion.
 * Solo el autor o super_admin.
 */
export async function canEditProjectUpdate(
  profile: PrismaUser,
  updateId: string,
): Promise<boolean> {
  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: { authorId: true, deletedAt: true },
  });

  if (!update || update.deletedAt) return false;
  if (profile.role === "super_admin") return true;
  return update.authorId === profile.id;
}

/**
 * Verifica si un usuario puede eliminar una actualizacion.
 * Solo el autor o super_admin.
 */
export async function canDeleteProjectUpdate(
  profile: PrismaUser,
  updateId: string,
): Promise<boolean> {
  return canEditProjectUpdate(profile, updateId);
}

/**
 * Obtiene el historial de estado de una obra.
 */
export async function getProjectStatusHistory(projectId: string) {
  return prisma.projectStatusHistory.findMany({
    where: { projectId },
    include: {
      changer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });
}
