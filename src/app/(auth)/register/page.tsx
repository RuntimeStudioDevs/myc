import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { signUpAction } from "@/lib/auth/actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentAuthUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">MYC</h1>
          <p className="text-neutral-500">Crea tu cuenta</p>
        </div>

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={signUpAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Ya tienes cuenta?{" "}
          <a href="/login" className="text-neutral-900 underline">
            Inicia sesion
          </a>
        </p>
      </div>
    </main>
  );
}
