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

export async function createUpdateCommentAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const updateId = formData.get("updateId") as string;
  const content = formData.get("content") as string;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!updateId || !content || !content.trim()) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return redirect("/dashboard/projects?error=content-too-long");
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: { id: true, projectId: true, deletedAt: true },
  });

  if (!update || update.deletedAt) {
    return redirect("/dashboard/projects?error=update-not-found");
  }

  if (!(await canCreateUpdateComment(profile, updateId))) {
    return redirect("/dashboard/projects?error=not-authorized");
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
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!commentId || !content || !content.trim()) {
    const fallback = returnTo ?? "/dashboard/projects";
    return redirect(`${fallback}?error=missing-fields`);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    const fallback = returnTo ?? "/dashboard/projects";
    return redirect(`${fallback}?error=content-too-long`);
  }

  const comment = await prisma.updateComment.findUnique({
    where: { id: commentId },
    select: { id: true, updateId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) {
    const fallback = returnTo ?? "/dashboard/projects";
    return redirect(`${fallback}?error=comment-not-found`);
  }

  if (!(await canEditUpdateComment(profile, commentId))) {
    const fallback = returnTo ?? "/dashboard/projects";
    return redirect(`${fallback}?error=not-authorized`);
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: comment.updateId },
    select: { projectId: true },
  });

  if (!update) {
    const fallback = returnTo ?? "/dashboard/projects";
    return redirect(`${fallback}?error=update-not-found`);
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
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!commentId) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const comment = await prisma.updateComment.findUnique({
    where: { id: commentId },
    select: { id: true, updateId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) {
    return redirect("/dashboard/projects?error=comment-not-found");
  }

  if (!(await canDeleteUpdateComment(profile, commentId))) {
    return redirect("/dashboard/projects?error=not-authorized");
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: comment.updateId },
    select: { projectId: true },
  });

  if (!update) {
    return redirect("/dashboard/projects?error=update-not-found");
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
