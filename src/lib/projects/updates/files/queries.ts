import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrismaUser } from "@/lib/auth/types";

export async function listUpdateFiles(updateId: string) {
  return prisma.updateFile.findMany({
    where: {
      updateId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export type UpdateFileInfo = Awaited<
  ReturnType<typeof listUpdateFiles>
>[number];

export async function canUploadUpdateFile(
  profile: PrismaUser,
  projectId: string,
): Promise<boolean> {
  if (profile.role === "super_admin") return true;

  if (profile.role === "cliente") return false;

  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId: profile.id,
      unassignedAt: null,
    },
  });

  return assignment !== null;
}

export async function canDeleteUpdateFile(
  profile: PrismaUser,
  fileId: string,
): Promise<boolean> {
  const file = await prisma.updateFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      uploadedBy: true,
      deletedAt: true,
      update: {
        select: {
          authorId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!file || file.deletedAt || file.update.deletedAt) return false;
  if (profile.role === "super_admin") return true;

  // Uploader del archivo puede eliminar
  if (file.uploadedBy === profile.id) return true;

  // Autor de la actualizacion puede eliminar
  if (file.update.authorId === profile.id) return true;

  return false;
}
