import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// MYC — Storage configuration
// ============================================================

export const STORAGE_BUCKET = "myc-project-files";

// Tamaños maximos en bytes
export const MAX_FILE_SIZE = 10 * 1000 * 1000; // 10 MB (10 000 KB)
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25 MB

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
  "video/webm",
  "video/quicktime",
] as const;

// Archivos de actualizacion: imagenes, videos, PDF
export const ALLOWED_UPDATE_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const;

// Archivos de obra: imagenes, PDF (sin video)
export const ALLOWED_PROJECT_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const;

// Extensiones permitidas por tipo MIME
const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

// Genera rutas de storage
export function buildProjectFilePath(projectId: string, safeFilename: string): string {
  const uuid = crypto.randomUUID();
  return `projects/${projectId}/documents/${uuid}-${safeFilename}`;
}

export function buildUpdateFilePath(
  projectId: string,
  updateId: string,
  safeFilename: string,
): string {
  const uuid = crypto.randomUUID();
  return `projects/${projectId}/updates/${updateId}/evidence/${uuid}-${safeFilename}`;
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

// Determinar el tipo de archivo para UpdateFile
export function classifyUpdateFileType(
  mimeType: string,
): "foto" | "video" | "documento" {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return "foto";
  }
  if (mimeType === "application/pdf") {
    return "documento";
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
export const generateSignedUrl = cache(
  async (record: {
    provider?: string | null;
    providerId?: string | null;
    url: string;
  }): Promise<string | null> => {
    if (record.provider === "cloudinary" && record.url) {
      return record.url;
    }

    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(record.url, 300);
    return data?.signedUrl ?? null;
  },
);

// Generar thumbnail URL optimizado para Cloudinary (cacheada por request)
export const generateThumbnailUrl = cache(
  async (record: {
    provider?: string | null;
    url: string;
  }): Promise<string | null> => {
    if (record.provider === "cloudinary" && record.url) {
      const base = record.url.replace("/upload/", "/upload/c_thumb,w_200,h_200,q_auto,f_auto/");
      return base;
    }
    return null;
  },
);

// Decidir proveedor de storage segun MIME type
export type StorageProvider = "supabase" | "cloudinary";

export function resolveStorageProvider(_mimeType: string): StorageProvider {
  void _mimeType;
  return "cloudinary";
}
