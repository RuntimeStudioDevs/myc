"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      setNumPages(pages);
      setLoading(false);
      setError(null);
    },
    [],
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message);
    setLoading(false);
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.2, 3)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.2, 0.4)), []);
  const zoomReset = useCallback(() => setScale(1.2), []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
        <p className="text-sm text-red-600">
          No se pudo cargar el PDF: {error}
        </p>
        <p className="text-xs text-neutral-400">
          Intenta descargar el archivo para verlo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          <p className="text-sm text-neutral-500">Cargando PDF...</p>
        </div>
      )}

      {numPages > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-400">
            {numPages} {numPages === 1 ? "pagina" : "paginas"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={zoomOut}
              disabled={scale <= 0.4}
              className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 disabled:opacity-40"
              title="Reducir zoom"
            >
              −
            </button>
            <span className="text-xs text-neutral-600 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={scale >= 3}
              className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 disabled:opacity-40"
              title="Aumentar zoom"
            >
              +
            </button>
            <button
              type="button"
              onClick={zoomReset}
              className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
              title="Restablecer zoom"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
            <p className="text-sm text-neutral-500">Cargando PDF...</p>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-4">
            <p className="text-sm text-red-600">
              No se pudo cargar el PDF.
            </p>
            <p className="text-xs text-neutral-400">
              Verifica que el archivo exista o intenta descargarlo.
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={`page_${i + 1}`}
              className="rounded border border-neutral-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="bg-neutral-50 border-b border-neutral-100 px-3 py-1">
                <span className="text-xs text-neutral-400">
                  Pagina {i + 1} de {numPages}
                </span>
              </div>
              <div className="flex justify-center p-4">
                <Page
                  pageNumber={i + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="max-w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </Document>

      {!loading && numPages === 0 && !error && (
        <p className="text-sm text-neutral-400 text-center py-8">
          El archivo no contiene paginas.
        </p>
      )}
    </div>
  );
}
