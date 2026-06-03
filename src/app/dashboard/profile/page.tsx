import Link from "next/link";
import { requireActiveProfile } from "@/lib/auth/guards";
import { updateOwnPasswordAction, requestEmailChangeAction } from "@/lib/profile/actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    "password-updated"?: string;
    "email-updated"?: string;
  }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-neutral-500">Gestiona tu cuenta</p>
        </div>

        {params.error === "password-required" && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            Debes ingresar tu contrasena actual para cambiar el email.
          </p>
        )}
        {params.error === "invalid-password" && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            La contrasena actual es incorrecta.
          </p>
        )}
        {params.error && params.error !== "password-required" && params.error !== "invalid-password" && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(params.error)}
          </p>
        )}
        {params["password-updated"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Contrasena actualizada correctamente.
          </p>
        )}
        {params["email-updated"] === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Email actualizado correctamente.
          </p>
        )}

        <div className="rounded border border-neutral-200 p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Nombre:</span> {profile.name}
          </div>
          <div>
            <span className="font-medium">Email:</span> {profile.email}
          </div>
          <div>
            <span className="font-medium">Rol:</span>{" "}
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
              {profile.role}
            </span>
          </div>
          <div>
            <span className="font-medium">Estado:</span>{" "}
            {profile.active ? (
              <span className="text-green-700">Activo</span>
            ) : (
              <span className="text-red-600">Inactivo</span>
            )}
          </div>
          <div>
            <span className="font-medium">Miembro desde:</span>{" "}
            {new Date(profile.createdAt).toLocaleDateString()}
          </div>
          {profile.updatedAt && (
            <div>
              <span className="font-medium">Ultima actualizacion:</span>{" "}
              {new Date(profile.updatedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <section className="rounded border border-neutral-200 p-4 space-y-3">
          <h2 className="font-medium text-sm">Cambiar contrasena</h2>
          <form action={updateOwnPasswordAction} className="space-y-3">
            <input
              name="password"
              type="password"
              placeholder="Nueva contrasena"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirmar contrasena"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Actualizar contrasena
            </button>
          </form>
        </section>

        <section className="rounded border border-neutral-200 p-4 space-y-3">
          <h2 className="font-medium text-sm">Cambiar email</h2>
          <form action={requestEmailChangeAction} className="space-y-3">
            <input
              name="email"
              type="email"
              placeholder="Nuevo email"
              required
              autoComplete="email"
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <input
              name="currentPassword"
              type="password"
              placeholder="Contrasena actual"
              required
              autoComplete="current-password"
              className="w-full rounded border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <p className="text-xs text-neutral-400">
              Por seguridad, confirma tu contrasena actual. Luego enviaremos un codigo de 6 digitos al nuevo correo.
            </p>
            <button
              type="submit"
              className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Solicitar cambio de email
            </button>
          </form>
        </section>

        <Link
          href="/dashboard"
          className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium hover:bg-neutral-50"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
