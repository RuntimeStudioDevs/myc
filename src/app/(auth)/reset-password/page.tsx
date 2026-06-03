import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { resetPasswordAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/forgot-password?error=" + encodeURIComponent("Debes usar el enlace enviado a tu correo para restablecer tu contrasena."));
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Crear nueva contrasena</h1>
          <p className="text-neutral-500">
            Ingresa tu nueva contrasena para recuperar el acceso a tu cuenta.
          </p>
        </div>

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={resetPasswordAction} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Nueva contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Confirmar contrasena
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <SubmitButton type="submit" pendingText="Actualizando..." className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Actualizar contrasena</SubmitButton>
        </form>

        <p className="text-center text-sm text-neutral-500">
          <Link href="/" className="text-neutral-400 underline hover:text-neutral-700">
            Inicio
          </Link>
          {" · "}
          <Link href="/login" className="text-neutral-900 underline">
            Volver al inicio de sesion
          </Link>
        </p>
      </div>
    </main>
  );
}
