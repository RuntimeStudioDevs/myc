import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { forgotPasswordAction } from "@/lib/auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; "email-sent"?: string }>;
}) {
  const user = await getCurrentAuthUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error;
  const emailSent = params["email-sent"];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Recuperar contrasena</h1>
          <p className="text-neutral-500">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu
            contrasena.
          </p>
        </div>

        {emailSent === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Si el correo existe, recibiras un enlace para restablecer tu
            contrasena. Revisa tu bandeja de entrada.
          </p>
        )}

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={forgotPasswordAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Enviar enlace
          </button>
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
