"use client";

import { useState, useCallback, useEffect } from "react";

interface ImageItem {
  src: string;
  alt: string;
  fileName: string;
}

interface ImageLightboxProps {
  images: ImageItem[];
  children?: React.ReactNode;
}

export function ImageLightbox({ images, children }: ImageLightboxProps) {
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => {
    setIndex(i);
  }, []);

  const close = useCallback(() => {
    setIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % images.length;
    });
  }, [images.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + images.length) % images.length;
    });
  }, [images.length]);

  useEffect(() => {
    if (index === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [index, close, goNext, goPrev]);

  useEffect(() => {
    if (index !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [index]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => open(i)}
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.alt}
              className="h-20 w-28 rounded border object-cover hover:opacity-80 transition-opacity"
            />
          </button>
        ))}
        {children}
      </div>

      {index !== null && (
        <dialog
          open
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ${index + 1} de ${images.length}: ${images[index].fileName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 border-none m-0 w-full h-full max-w-none max-h-none"
          onClick={close}
        >
          <div
            className="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute -top-10 right-0 text-white text-2xl hover:text-neutral-300"
            >
              ✕
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[index].src}
              alt={images[index].alt}
              className="max-w-full max-h-[80vh] rounded object-contain"
            />

            <p className="mt-3 text-sm text-white">
              {images[index].fileName}
              {" — "}
              Imagen {index + 1} de {images.length}
            </p>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-3xl hover:text-neutral-300 px-2"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-3xl hover:text-neutral-300 px-2"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
