import Link from "next/link";
import type { ReactNode } from "react";

interface FilePreviewProps {
  fileName: string;
  signedUrl: string | null;
  size: number;
  fileType?: string;
  projectId?: string;
  fileId?: string;
  updateId?: string;
  children?: ReactNode;
}

function inferMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "mp4":
      return "video/mp4";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TypeBadge({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("video/")) {
    return (
      <span className="text-xs text-neutral-400 shrink-0">Video</span>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <span className="text-xs text-neutral-400 shrink-0">PDF</span>
    );
  }
  return (
    <span className="text-xs text-neutral-400 shrink-0">Archivo</span>
  );
}

export function FilePreview({
  fileName,
  signedUrl,
  size,
  fileType,
  projectId,
  fileId,
  updateId,
  children,
}: FilePreviewProps) {
  const mimeType = fileType
    ? fileType === "video"
      ? "video/mp4"
      : fileType === "foto"
        ? "image/jpeg"
        : fileType === "pdf" || fileType === "documento"
          ? "application/pdf"
          : fileType.startsWith("video/") || fileType.startsWith("image/")
            ? fileType
            : inferMimeType(fileName)
    : inferMimeType(fileName);
  const isImage = mimeType.startsWith("image/");
  const sizeLabel = formatSize(size);

  const preview = isImage && signedUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={signedUrl}
      alt={fileName}
      className="h-8 w-12 shrink-0 rounded object-cover"
    />
  ) : (
    <TypeBadge mimeType={mimeType} />
  );

  const isProjectPdf =
    mimeType === "application/pdf" && projectId && fileId && !updateId;

  const isUpdatePdf =
    mimeType === "application/pdf" && projectId && updateId && fileId;

  const viewLink = isProjectPdf ? (
    <Link
      href={`/dashboard/projects/${projectId}/files/${fileId}`}
      className="rounded bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200 shrink-0"
    >
      Ver
    </Link>
  ) : isUpdatePdf ? (
    <Link
      href={`/dashboard/projects/${projectId}/updates/${updateId}/files/${fileId}`}
      className="rounded bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200 shrink-0"
    >
      Ver
    </Link>
  ) : signedUrl ? (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded bg-neutral-100 px-2 py-0.5 text-xs hover:bg-neutral-200 shrink-0"
    >
      Ver
    </a>
  ) : null;

  if (children) {
    return (
      <div className="flex items-center justify-between gap-2 rounded bg-neutral-50 px-2 py-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {preview}
          <span className="text-xs text-neutral-700 truncate">
            {fileName}
          </span>
          <span className="text-xs text-neutral-400 shrink-0">
            {sizeLabel}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          {viewLink}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded bg-neutral-50 px-2 py-1.5">
      {preview}
      <span className="text-xs text-neutral-700 truncate flex-1">
        {fileName}
      </span>
      <span className="text-xs text-neutral-400 shrink-0">
        {sizeLabel}
      </span>
      {viewLink}
    </div>
  );
}
