import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canViewUpdateFile } from "@/lib/projects/updates/files/queries";
import { generateSignedUrl } from "@/lib/projects/storage";
import PdfViewer from "@/components/files/pdf-viewer";

export default async function UpdateFileViewerPage({
  params,
}: {
  params: Promise<{
    projectId: string;
    updateId: string;
    fileId: string;
  }>;
}) {
  const { projectId, updateId, fileId } = await params;

  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-neutral-500">Debes iniciar sesion para ver este archivo.</p>
      </main>
    );
  }

  const file = await prisma.updateFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      updateId: true,
      fileName: true,
      url: true,
      provider: true,
      providerId: true,
      deletedAt: true,
      update: {
        select: {
          id: true,
          projectId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!file || file.deletedAt || file.update.deletedAt) {
    notFound();
  }

  if (file.updateId !== updateId || file.update.projectId !== projectId) {
    notFound();
  }

  if (!(await canViewUpdateFile(profile, projectId))) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-neutral-500">No tienes acceso a este archivo.</p>
      </main>
    );
  }

  const isPdf =
    file.fileName.toLowerCase().endsWith(".pdf");

  const signedUrl = await generateSignedUrl({
    provider: file.provider,
    providerId: file.providerId,
    url: file.url,
  });

  const downloadHref = `/dashboard/projects/${projectId}/updates/${updateId}/files/${fileId}/download`;

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold truncate max-w-md" title={file.fileName}>
              {file.fileName}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadHref}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Descargar
            </a>
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
            >
              Volver a obra
            </Link>
          </div>
        </div>

        <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
          {isPdf && signedUrl ? (
            <PdfViewer fileUrl={signedUrl} fileName={file.fileName} />
          ) : signedUrl ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
              <p className="text-sm text-neutral-500">
                Este tipo de archivo no tiene vista previa.
              </p>
              <a
                href={downloadHref}
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Descargar archivo
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4">
              <p className="text-sm text-neutral-500">
                No se pudo generar la URL de visualizacion.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
