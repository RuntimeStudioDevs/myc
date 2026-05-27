"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Error inesperado</h1>
          <p className="text-sm text-neutral-500 mt-2">
            Ocurrio un problema al cargar esta pagina.
          </p>
        </div>

        {error.message && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800 break-words">
            {error.message}
          </p>
        )}

        <button
          type="button"
          onClick={handleRetry}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
