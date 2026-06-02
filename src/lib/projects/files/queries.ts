import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrismaUser } from "@/lib/auth/types";

export async function listProjectFiles(projectId: string) {
  return prisma.projectFile.findMany({
    where: {
      projectId,
      deletedAt: null,
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export type ProjectFileWithUploader = Awaited<
  ReturnType<typeof listProjectFiles>
>[number];

export async function canUploadProjectFile(
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

export async function canDeleteProjectFile(
  profile: PrismaUser,
  fileId: string,
): Promise<boolean> {
  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    select: { uploadedBy: true, deletedAt: true },
  });

  if (!file || file.deletedAt) return false;
  if (profile.role === "super_admin") return true;
  return file.uploadedBy === profile.id;
}

export async function canViewProjectFile(
  profile: PrismaUser,
  projectId: string,
): Promise<boolean> {
  if (profile.role === "super_admin") return true;

  const hasAssignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId: profile.id,
      unassignedAt: null,
    },
  });

  if (hasAssignment) return true;

  if (profile.role === "cliente") {
    const project = await prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      select: { client: { select: { userId: true } } },
    });
    return project?.client?.userId === profile.id;
  }

  return false;
}
