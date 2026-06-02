import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canViewProjectFile } from "@/lib/projects/files/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
) {
  const { projectId, fileId } = await params;

  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  if (!(await canViewProjectFile(profile, projectId))) {
    return new NextResponse("Acceso denegado", { status: 403 });
  }

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      fileName: true,
      url: true,
      provider: true,
      providerId: true,
      deletedAt: true,
    },
  });

  if (!file || file.deletedAt || file.projectId !== projectId) {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }

  const safeFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  let downloadUrl: string;

  if (file.provider === "cloudinary" && file.url) {
    downloadUrl = file.url;
  } else if (file.provider === "supabase" && file.url) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.storage
      .from("myc-project-files")
      .createSignedUrl(file.url, 300);
    downloadUrl = data?.signedUrl ?? "";
  } else {
    return new NextResponse("URL no disponible", { status: 500 });
  }

  if (!downloadUrl) {
    return new NextResponse("URL no disponible", { status: 500 });
  }

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    return new NextResponse("Error al obtener el archivo", { status: 502 });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  headers.set("Content-Type", contentType);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(safeFileName)}"`,
  );

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  headers.set("Cache-Control", "no-store");

  return new NextResponse(response.body, {
    status: 200,
    headers,
  });
}
