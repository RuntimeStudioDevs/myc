import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } from "@/lib/projects/storage";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Variables de entorno de Cloudinary no configuradas. " +
        "Requeridas: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

type CloudinaryResourceType = "image" | "video" | "raw";

function getResourceType(mimeType: string): CloudinaryResourceType {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return "image";
  }
  if ((ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType)) {
    return "raw";
  }
  return "video";
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

interface UploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
  format: string;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    mimeType: string;
    folder: string;
    filename: string;
  },
): Promise<UploadResult> {
  ensureConfigured();

  const resourceType = getResourceType(options.mimeType);

  return new Promise<UploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: options.folder,
        public_id: `${crypto.randomUUID()}-${stripExtension(options.filename)}`,
        type: "upload",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new Error(error?.message ?? "Error al subir archivo a Cloudinary"),
          );
        }
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
          bytes: result.bytes,
          format: result.format,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

export async function destroyCloudinaryFile(
  publicId: string,
  resourceType: CloudinaryResourceType = "image",
): Promise<boolean> {
  ensureConfigured();

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: "upload",
    });
    return result.result === "ok";
  } catch (error) {
    console.error("Error al eliminar archivo de Cloudinary:", error);
    return false;
  }
}

export function getCloudinarySignedUrl(
  publicId: string,
  options?: { resourceType?: CloudinaryResourceType },
): string {
  ensureConfigured();

  return cloudinary.url(publicId, {
    sign_url: true,
    type: "upload",
    secure: true,
    resource_type: options?.resourceType ?? "image",
    analytics: false,
  });
}

export function getCloudinaryThumbnailUrl(
  publicId: string,
  options?: {
    resourceType?: CloudinaryResourceType;
    width?: number;
    height?: number;
  },
): string {
  ensureConfigured();

  return cloudinary.url(publicId, {
    sign_url: true,
    type: "upload",
    secure: true,
    resource_type: options?.resourceType ?? "image",
    analytics: false,
    transformation: [
      {
        width: options?.width ?? 200,
        height: options?.height ?? 200,
        crop: "thumb",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });
}
