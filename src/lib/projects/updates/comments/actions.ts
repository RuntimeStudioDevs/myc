"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  canCreateUpdateComment,
  canEditUpdateComment,
  canDeleteUpdateComment,
} from "@/lib/projects/updates/comments/queries";

const MAX_CONTENT_LENGTH = 2000;

function sanitizeReturnTo(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/dashboard")) return value;
  return null;
}

export async function createUpdateCommentAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const updateId = formData.get("updateId") as string;
  const content = formData.get("content") as string;
  const returnTo = sanitizeReturnTo((formData.get("returnTo") as string) || null);

  const fallbackProjects = returnTo ?? "/dashboard/projects";

  if (!updateId || !content || !content.trim()) {
    return redirect(`${fallbackProjects}?error=missing-fields`);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return redirect(`${fallbackProjects}?error=content-too-long`);
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: { id: true, projectId: true, deletedAt: true },
  });

  if (!update || update.deletedAt) {
    return redirect(`${fallbackProjects}?error=update-not-found`);
  }

  if (!(await canCreateUpdateComment(profile, updateId))) {
    const projectFallback = returnTo ?? `/dashboard/projects/${update.projectId}`;
    return redirect(`${projectFallback}?error=not-authorized`);
  }

  const normalizedContent = content.trim().replace(/\s+/g, " ");
  const tenSecondsAgo = new Date(Date.now() - 10_000);

  const recentDuplicate = await prisma.updateComment.findFirst({
    where: {
      updateId,
      authorId: profile.id,
      content: normalizedContent,
      deletedAt: null,
      createdAt: { gt: tenSecondsAgo },
    },
    select: { id: true },
  });

  if (recentDuplicate) {
    revalidatePath(`/dashboard/projects/${update.projectId}`);
    if (returnTo) {
      revalidatePath(returnTo);
      redirect(`${returnTo}?comment-created=true`);
    }
    redirect(`/dashboard/projects/${update.projectId}?comment-created=true`);
  }

  await prisma.updateComment.create({
    data: {
      updateId,
      authorId: profile.id,
      content: content.trim(),
    },
  });

  revalidatePath(`/dashboard/projects/${update.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?comment-created=true`);
  }
  redirect(`/dashboard/projects/${update.projectId}?comment-created=true`);
}

export async function editUpdateCommentAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const commentId = formData.get("commentId") as string;
  const content = formData.get("content") as string;
  const returnTo = sanitizeReturnTo((formData.get("returnTo") as string) || null);

  const fallbackProjects = returnTo ?? "/dashboard/projects";

  if (!commentId || !content || !content.trim()) {
    return redirect(`${fallbackProjects}?error=missing-fields`);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return redirect(`${fallbackProjects}?error=content-too-long`);
  }

  const comment = await prisma.updateComment.findUnique({
    where: { id: commentId },
    select: { id: true, updateId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) {
    return redirect(`${fallbackProjects}?error=comment-not-found`);
  }

  if (!(await canEditUpdateComment(profile, commentId))) {
    const updateForFallback = await prisma.projectUpdate.findUnique({
      where: { id: comment.updateId },
      select: { projectId: true },
    });
    const projectFallback = returnTo ?? (updateForFallback
      ? `/dashboard/projects/${updateForFallback.projectId}`
      : "/dashboard/projects");
    return redirect(`${projectFallback}?error=not-authorized`);
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: comment.updateId },
    select: { projectId: true },
  });

  if (!update) {
    return redirect(`${fallbackProjects}?error=update-not-found`);
  }

  await prisma.updateComment.update({
    where: { id: commentId },
    data: {
      content: content.trim(),
      editedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/projects/${update.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?comment-edited=true`);
  }
  redirect(`/dashboard/projects/${update.projectId}?comment-edited=true`);
}

export async function deleteUpdateCommentAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const commentId = formData.get("commentId") as string;
  const returnTo = sanitizeReturnTo((formData.get("returnTo") as string) || null);

  const fallbackProjects = returnTo ?? "/dashboard/projects";

  if (!commentId) {
    return redirect(`${fallbackProjects}?error=missing-fields`);
  }

  const comment = await prisma.updateComment.findUnique({
    where: { id: commentId },
    select: { id: true, updateId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) {
    return redirect(`${fallbackProjects}?error=comment-not-found`);
  }

  if (!(await canDeleteUpdateComment(profile, commentId))) {
    const updateForFallback = await prisma.projectUpdate.findUnique({
      where: { id: comment.updateId },
      select: { projectId: true },
    });
    const projectFallback = returnTo ?? (updateForFallback
      ? `/dashboard/projects/${updateForFallback.projectId}`
      : "/dashboard/projects");
    return redirect(`${projectFallback}?error=not-authorized`);
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: comment.updateId },
    select: { projectId: true },
  });

  if (!update) {
    return redirect(`${fallbackProjects}?error=update-not-found`);
  }

  await prisma.updateComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/dashboard/projects/${update.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?comment-deleted=true`);
  }
  redirect(`/dashboard/projects/${update.projectId}?comment-deleted=true`);
}
