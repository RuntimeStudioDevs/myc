import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// MYC — Storage configuration
// ============================================================

export const STORAGE_BUCKET = "myc-project-files";

// Tamaños maximos en bytes
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

// Tipos MIME permitidos
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
] as const;

export const ALLOWED_UPDATE_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
] as const;

export const ALLOWED_PROJECT_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_VIDEO_TYPES,
] as const;

// Extensiones permitidas por tipo MIME
const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "video/mp4": [".mp4"],
};

// Genera rutas de storage
export function buildProjectFilePath(projectId: string, safeFilename: string): string {
  const timestamp = Date.now();
  return `projects/${projectId}/files/${timestamp}-${safeFilename}`;
}

export function buildUpdateFilePath(
  projectId: string,
  updateId: string,
  safeFilename: string,
): string {
  const timestamp = Date.now();
  return `projects/${projectId}/updates/${updateId}/${timestamp}-${safeFilename}`;
}

// Sanitizar nombre de archivo
export function sanitizeFilename(original: string): string {
  return original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

// Obtener extension de un MIME type
export function getExtensionFromMime(mimeType: string): string {
  const extensions = MIME_EXTENSIONS[mimeType];
  if (extensions && extensions.length > 0) {
    return extensions[0];
  }
  return "";
}

// Determinar el tipo de archivo para UpdateFile (foto o video)
export function classifyUpdateFileType(mimeType: string): "foto" | "video" {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return "foto";
  }
  return "video";
}

// Determinar el tipo de archivo para ProjectFile
export function classifyProjectFileType(mimeType: string): "foto" | "documento" | "pdf" | "otro" {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return "foto";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)) {
    return "otro";
  }
  return "otro";
}

// Validar MIME type contra lista de permitidos
export function isValidMimeType(
  mimeType: string,
  allowedTypes: readonly string[],
): boolean {
  return allowedTypes.includes(mimeType);
}

// Validar tamaño
export function isValidFileSize(size: number, isVideo: boolean): boolean {
  const max = isVideo ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
  return size > 0 && size <= max;
}

// Validar extension contra MIME type esperado
export function isValidExtension(filename: string, mimeType: string): boolean {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const validExts = MIME_EXTENSIONS[mimeType] ?? [];
  return validExts.includes(ext);
}

// Generar signed URL para descarga segura (cacheada por request)
export const generateSignedUrl = cache(async (filePath: string): Promise<string | null> => {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 300);
  return data?.signedUrl ?? null;
});
