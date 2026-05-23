import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { signInAction } from "@/lib/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const user = await getCurrentAuthUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error;
  const registered = params.registered;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">MYC</h1>
          <p className="text-neutral-500">Inicia sesion en tu cuenta</p>
        </div>

        {registered === "true" && (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Cuenta creada. Ya puedes iniciar sesion.
          </p>
        )}

        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={signInAction} className="space-y-4">
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
              autoComplete="current-password"
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          No tienes cuenta?{" "}
          <a href="/register" className="text-neutral-900 underline">
            Registrate
          </a>
        </p>
      </div>
    </main>
  );
}
