"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
  canUploadProjectFile,
  canDeleteProjectFile,
} from "@/lib/projects/files/queries";
import {
  STORAGE_BUCKET,
  ALLOWED_PROJECT_FILE_TYPES,
  buildProjectFilePath,
  sanitizeFilename,
  classifyProjectFileType,
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

export async function uploadProjectFileAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const projectId = formData.get("projectId") as string;
  const file = formData.get("file") as File | null;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!projectId || !file || file.size === 0) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=file-required`);
  }

  if (!isValidMimeType(file.type, ALLOWED_PROJECT_FILE_TYPES)) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=invalid-file-type`);
  }

  if (!isValidExtension(file.name, file.type)) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=invalid-file-type`);
  }

  const isVideo = file.type.startsWith("video/");
  if (!isValidFileSize(file.size, isVideo)) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=file-too-large`);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    return redirect("/dashboard/projects?error=project-not-found");
  }

  if (!(await canUploadProjectFile(profile, projectId))) {
    const fallback = returnTo ?? `/dashboard/projects/${projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  const provider = resolveStorageProvider(file.type);
  const fallbackPath = returnTo ?? `/dashboard/projects/${projectId}`;

  if (provider === "cloudinary") {
    if (!isCloudinaryConfigured()) {
      return redirect(`${fallbackPath}?error=upload-failed`);
    }

    const isPdf = file.type === "application/pdf";
    const folder = isPdf
      ? `myc/projects/${projectId}/documents`
      : `myc/projects/${projectId}/images`;

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
      return redirect(`${fallbackPath}?error=upload-failed`);
    }

    try {
      await prisma.projectFile.create({
        data: {
          projectId,
          uploadedBy: profile.id,
          fileType: classifyProjectFileType(file.type),
          url: cloudinaryResult.secureUrl,
          fileName: file.name || "archivo",
          size: file.size,
          provider: "cloudinary",
          providerId: cloudinaryResult.publicId,
        },
      });
    } catch {
      await destroyCloudinaryFile(
        cloudinaryResult.publicId,
        cloudinaryResult.resourceType as "image" | "video" | "raw",
      );
      return redirect(`${fallbackPath}?error=upload-failed`);
    }
  } else {
    const safeName = `${sanitizeFilename(file.name || "archivo")}`;
    const filePath = buildProjectFilePath(projectId, safeName);
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
      return redirect(`${fallbackPath}?error=upload-failed`);
    }

    await prisma.projectFile.create({
      data: {
        projectId,
        uploadedBy: profile.id,
        fileType: classifyProjectFileType(file.type),
        url: filePath,
        fileName: file.name || "archivo",
        size: file.size,
        provider: "supabase",
      },
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?file-uploaded=true`);
  }
  redirect(`/dashboard/projects/${projectId}?file-uploaded=true`);
}

export async function deleteProjectFileAction(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  const fileId = formData.get("fileId") as string;
  const returnTo = (formData.get("returnTo") as string) || null;

  if (!fileId) {
    return redirect("/dashboard/projects?error=missing-fields");
  }

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      url: true,
      provider: true,
      providerId: true,
      deletedAt: true,
    },
  });

  if (!file || file.deletedAt) {
    return redirect("/dashboard/projects?error=file-not-found");
  }

  if (!(await canDeleteProjectFile(profile, fileId))) {
    const fallback = returnTo ?? `/dashboard/projects/${file.projectId}`;
    return redirect(`${fallback}?error=not-authorized`);
  }

  // Soft delete en DB
  await prisma.projectFile.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });

  // Intentar eliminar del proveedor
  if (file.provider === "cloudinary" && file.providerId) {
    const resourceType = file.url?.endsWith(".pdf") ? "raw" : "image";
    await destroyCloudinaryFile(file.providerId, resourceType);
  } else {
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([file.url]);
    } catch {
      // El archivo ya puede no existir en storage
    }
  }

  revalidatePath(`/dashboard/projects/${file.projectId}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(`${returnTo}?file-deleted=true`);
  }
  redirect(`/dashboard/projects/${file.projectId}?file-deleted=true`);
}

export async function getProjectFileUrlAction(fileId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    return null;
  }

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      url: true,
      provider: true,
      providerId: true,
      deletedAt: true,
    },
  });

  if (!file || file.deletedAt) return null;

  return generateSignedUrl({
    provider: file.provider,
    providerId: file.providerId,
    url: file.url,
  });
}
