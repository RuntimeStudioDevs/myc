import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrismaUser } from "@/lib/auth/types";

export async function listUpdateComments(updateId: string) {
  return prisma.updateComment.findMany({
    where: {
      updateId,
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
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export type UpdateCommentWithAuthor = Awaited<
  ReturnType<typeof listUpdateComments>
>[number];

export async function canCreateUpdateComment(
  profile: PrismaUser,
  updateId: string,
): Promise<boolean> {
  if (profile.role === "super_admin") return true;

  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: {
      id: true,
      deletedAt: true,
      project: {
        select: {
          id: true,
          client: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!update || update.deletedAt) return false;

  // Cliente: puede comentar si la obra pertenece a su cliente
  if (profile.role === "cliente") {
    return update.project.client.userId === profile.id;
  }

  // Ingeniero o marketing: requieren asignacion activa
  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId: update.project.id,
      userId: profile.id,
      unassignedAt: null,
    },
  });

  return assignment !== null;
}

export async function canEditUpdateComment(
  profile: PrismaUser,
  commentId: string,
): Promise<boolean> {
  const comment = await prisma.updateComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) return false;
  if (profile.role === "super_admin") return true;
  return comment.authorId === profile.id;
}

export async function canDeleteUpdateComment(
  profile: PrismaUser,
  commentId: string,
): Promise<boolean> {
  return canEditUpdateComment(profile, commentId);
}
