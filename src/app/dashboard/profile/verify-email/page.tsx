import Link from "next/link";
import { requireActiveProfile } from "@/lib/auth/guards";
import { verifyEmailChangeAction } from "@/lib/profile/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  await requireActiveProfile();
  const params = await searchParams;
  const error = params.error;
  const sent = params.sent;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Verificar nuevo email</h1>
          <p className="text-neutral-500">
            Ingresa el codigo de 6 digitos que enviamos a tu nuevo correo.
          </p>
        </div>

        {sent === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Te enviamos un codigo de 6 digitos al nuevo correo.
          </p>
        )}

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={verifyEmailChangeAction} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium">
              Codigo de verificacion
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              required
              autoComplete="one-time-code"
              placeholder="000000"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest"
            />
          </div>

          <SubmitButton type="submit" pendingText="Verificando..." className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Verificar codigo</SubmitButton>
        </form>

        <div className="space-y-3">
          <form action={verifyEmailChangeAction} className="hidden">
            <input type="hidden" name="code" value="resend-trigger" />
          </form>
          <Link
            href="/dashboard/profile/verify-email"
            className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium hover:bg-neutral-50"
          >
            Reenviar codigo
          </Link>
          <Link
            href="/dashboard/profile"
            className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium hover:bg-neutral-50"
          >
            Volver a Mi Perfil
          </Link>
        </div>
      </div>
    </main>
  );
}
