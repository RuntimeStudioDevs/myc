import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <p className="text-6xl font-bold text-neutral-300">404</p>

        <div>
          <h1 className="text-2xl font-bold">Pagina no encontrada</h1>
          <p className="text-sm text-neutral-500 mt-2">
            La pagina que buscas no existe, fue movida o no tienes acceso a
            ella.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Volver al dashboard
          </Link>

          <Link
            href="/login"
            className="block w-full rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Ir al inicio de sesion
          </Link>
        </div>
      </div>
    </main>
  );
}
