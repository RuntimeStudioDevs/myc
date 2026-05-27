import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrismaUser } from "@/lib/auth/types";

export async function listProjectComments(projectId: string) {
  return prisma.projectComment.findMany({
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
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export type ProjectCommentWithAuthor = Awaited<
  ReturnType<typeof listProjectComments>
>[number];

export async function canCreateProjectComment(
  profile: PrismaUser,
  projectId: string,
): Promise<boolean> {
  if (profile.role === "super_admin") return true;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      deletedAt: true,
      client: {
        select: { userId: true },
      },
    },
  });

  if (!project || project.deletedAt) return false;

  // Cliente: puede comentar si la obra pertenece a su cliente
  if (profile.role === "cliente") {
    return project.client.userId === profile.id;
  }

  // Ingeniero o marketing: requieren asignacion activa
  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId: profile.id,
      unassignedAt: null,
    },
  });

  return assignment !== null;
}

export async function canEditProjectComment(
  profile: PrismaUser,
  commentId: string,
): Promise<boolean> {
  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) return false;
  if (profile.role === "super_admin") return true;
  return comment.authorId === profile.id;
}

export async function canDeleteProjectComment(
  profile: PrismaUser,
  commentId: string,
): Promise<boolean> {
  return canEditProjectComment(profile, commentId);
}
