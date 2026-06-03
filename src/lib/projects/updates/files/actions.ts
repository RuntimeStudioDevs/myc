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
  isValidExtension,
  resolveStorageProvider,
  generateSignedUrl,
} from "@/lib/projects/storage";
import {
  isCloudinaryConfigured,
  uploadToCloudinary,
  destroyCloudinaryFile,
} from "@/lib/cloudinary/service";

interface UploadSingleResult {
  ok: boolean;
  error?: string;
}

export async function uploadSingleUpdateFile(
  file: File,
  updateId: string,
  projectId: string,
  uploadedById: string,
): Promise<UploadSingleResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "file-required" };
  }

  if (!isValidMimeType(file.type, ALLOWED_UPDATE_FILE_TYPES)) {
    return { ok: false, error: "invalid-file-type" };
  }

  if (!isValidExtension(file.name, file.type)) {
    return { ok: false, error: "invalid-file-type" };
  }

  const isVideo = file.type.startsWith("video/");
  if (!isValidFileSize(file.size, isVideo)) {
    return { ok: false, error: "file-too-large" };
  }

  if (isVideo) {
    const existingVideos = await prisma.updateFile.count({
      where: { updateId, fileType: "video", deletedAt: null },
    });
    if (existingVideos >= 1) {
      return { ok: false, error: "video-limit-reached" };
    }
  }

  const provider = resolveStorageProvider(file.type);

  if (provider === "cloudinary") {
    if (!isCloudinaryConfigured()) {
      return { ok: false, error: "upload-failed" };
    }

    const isPdf = file.type === "application/pdf";
    const folder = isPdf
      ? `myc/projects/${projectId}/updates/${updateId}/documents`
      : `myc/projects/${projectId}/updates/${updateId}/evidence`;

    const buffer = Buffer.from(await file.arrayBuffer());
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadToCloudinary(buffer, {
        mimeType: file.type,
        folder,
        filename: sanitizeFilename(file.name || "archivo"),
      });
    } catch (e) {
      console.error("[MYC-UPLOAD] Cloudinary upload failed:", e instanceof Error ? e.message : String(e));
      return { ok: false, error: "upload-failed" };
    }

    try {
      await prisma.updateFile.create({
        data: {
          updateId,
          fileType: classifyUpdateFileType(file.type),
          url: cloudinaryResult.secureUrl,
          fileName: file.name || "archivo",
          size: file.size,
          uploadedBy: uploadedById,
          provider: "cloudinary",
          providerId: cloudinaryResult.publicId,
        },
      });
    } catch {
      await destroyCloudinaryFile(
        cloudinaryResult.publicId,
        cloudinaryResult.resourceType as "image" | "video" | "raw",
      );
      return { ok: false, error: "upload-failed" };
    }
  } else {
    const safeName = sanitizeFilename(file.name || "archivo");
    const filePath = buildUpdateFilePath(projectId, updateId, safeName);
    const supabaseAdmin = createAdminClient();

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[MYC-UPLOAD] Supabase upload failed:", JSON.stringify(uploadError));
      return { ok: false, error: "upload-failed" };
    }

    await prisma.updateFile.create({
      data: {
        updateId,
        fileType: classifyUpdateFileType(file.type),
        url: filePath,
        fileName: file.name || "archivo",
        size: file.size,
        uploadedBy: uploadedById,
        provider: "supabase",
      },
    });
  }

  return { ok: true };
}

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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    return redirect("/dashboard/projects?error=project-not-found");
  }

  if (!(await canUploadUpdateFile(profile, projectId))) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  const result = await uploadSingleUpdateFile(file, updateId, projectId, profile.id);

  const fallback = returnTo ?? `/dashboard/projects/${projectId}`;

  if (!result.ok) {
    return redirect(`${fallback}?error=${result.error ?? "upload-failed"}`);
  }

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
      provider: true,
      providerId: true,
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

  // Soft delete en BD
  await prisma.updateFile.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });

  // Intentar eliminar del proveedor
  if (file.provider === "cloudinary" && file.providerId) {
    const resourceType =
      file.url?.endsWith(".mp4") ||
      file.url?.endsWith(".webm") ||
      file.url?.endsWith(".mov")
        ? "video"
        : file.url?.endsWith(".pdf")
          ? "raw"
          : "image";
    await destroyCloudinaryFile(file.providerId, resourceType);
  } else {
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([file.url]);
    } catch {
      // El archivo ya puede no existir en storage
    }
  }

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
      provider: true,
      providerId: true,
      update: {
        select: { deletedAt: true },
      },
    },
  });

  if (!file || file.update.deletedAt) return null;

  return generateSignedUrl({
    provider: file.provider,
    providerId: file.providerId,
    url: file.url,
  });
}
