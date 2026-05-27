"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  canCreateProjectComment,
  canEditProjectComment,
  canDeleteProjectComment,
} from "@/lib/projects/comments/queries";

const MAX_CONTENT_LENGTH = 2000;

export async function createProjectCommentAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const projectId = formData.get("projectId") as string;
  const content = formData.get("content") as string;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!projectId || !content || !content.trim()) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=missing-fields`);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=content-too-long`);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    return redirect("/dashboard/projects?error=project-not-found");
  }

  if (!(await canCreateProjectComment(profile, projectId))) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  await prisma.projectComment.create({
    data: {
      projectId,
      authorId: profile.id,
      content: content.trim(),
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?comment-created=true`);
  }
  redirect(`/dashboard/projects/${projectId}?comment-created=true`);
}

export async function editProjectCommentAction(formData: FormData) {
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

  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    select: { id: true, projectId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) {
    const fallback = returnTo ?? "/dashboard/projects";
    return redirect(`${fallback}?error=comment-not-found`);
  }

  if (!(await canEditProjectComment(profile, commentId))) {
    const fallback =
      returnTo ?? `/dashboard/projects/${comment.projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  await prisma.projectComment.update({
    where: { id: commentId },
    data: {
      content: content.trim(),
      editedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/projects/${comment.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?comment-edited=true`);
  }
  redirect(`/dashboard/projects/${comment.projectId}?comment-edited=true`);
}

export async function deleteProjectCommentAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const commentId = formData.get("commentId") as string;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!commentId) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    select: { id: true, projectId: true, deletedAt: true },
  });

  if (!comment || comment.deletedAt) {
    return redirect("/dashboard/projects?error=comment-not-found");
  }

  if (!(await canDeleteProjectComment(profile, commentId))) {
    const fallback = returnTo ?? `/dashboard/projects/${comment.projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  await prisma.projectComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/dashboard/projects/${comment.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?comment-deleted=true`);
  }
  redirect(`/dashboard/projects/${comment.projectId}?comment-deleted=true`);
}
