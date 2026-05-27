"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
  canUploadUpdateFile,
  canDeleteUpdateFile,
} from "@/lib/projects/updates/files/queries";
import {
  STORAGE_BUCKET,
  ALLOWED_UPDATE_FILE_TYPES,
  buildUpdateFilePath,
  sanitizeFilename,
  classifyUpdateFileType,
  isValidMimeType,
  isValidFileSize,
} from "@/lib/projects/storage";

export async function uploadUpdateFileAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const updateId = formData.get("updateId") as string;
  const projectId = formData.get("projectId") as string;
  const file = formData.get("file") as File | null;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!updateId || !projectId || !file || file.size === 0) {
    return redirect("/dashboard/projects?error=file-required");
  }

  if (!isValidMimeType(file.type, ALLOWED_UPDATE_FILE_TYPES)) {
    return redirect("/dashboard/projects?error=invalid-file-type");
  }

  const isVideo = file.type.startsWith("video/");
  if (!isValidFileSize(file.size, isVideo)) {
    return redirect("/dashboard/projects?error=file-too-large");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    return redirect("/dashboard/projects?error=project-not-found");
  }

  const update = await prisma.projectUpdate.findUnique({
    where: { id: updateId },
    select: { id: true, deletedAt: true },
  });

  if (!update || update.deletedAt) {
    return redirect("/dashboard/projects?error=update-not-found");
  }

  if (!(await canUploadUpdateFile(profile, projectId))) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  const safeName = `${sanitizeFilename(file.name || "archivo")}`;
  const filePath = buildUpdateFilePath(projectId, updateId, safeName);
  const supabaseAdmin = createAdminClient();

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=upload-failed`);
  }

  await prisma.updateFile.create({
    data: {
      updateId,
      fileType: classifyUpdateFileType(file.type),
      url: filePath,
      fileName: file.name || "archivo",
      size: file.size,
    },
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?file-uploaded=true`);
  }
  redirect(`/dashboard/projects/${projectId}?file-uploaded=true`);
}

export async function deleteUpdateFileAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const fileId = formData.get("fileId") as string;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!fileId) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const file = await prisma.updateFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      url: true,
      update: {
        select: {
          id: true,
          projectId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!file || file.update.deletedAt) {
    return redirect("/dashboard/projects?error=file-not-found");
  }

  if (!(await canDeleteUpdateFile(profile, fileId))) {
    const fallback = returnTo ?? `/dashboard/projects/${file.update.projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  // Delete fisico de UpdateFile (el modelo no tiene deletedAt)
  await prisma.updateFile.delete({
    where: { id: fileId },
  });

  // Intentar eliminar de Storage
  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([file.url]);

  revalidatePath(`/dashboard/projects/${file.update.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?file-deleted=true`);
  }
  redirect(`/dashboard/projects/${file.update.projectId}?file-deleted=true`);
}

export async function getUpdateFileUrlAction(fileId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    return null;
  }

  const file = await prisma.updateFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      url: true,
      update: {
        select: { deletedAt: true },
      },
    },
  });

  if (!file || file.update.deletedAt) return null;

  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.url, 300);

  return data?.signedUrl ?? null;
}
