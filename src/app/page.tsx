import Link from "next/link";

import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/auth/login/actions";
import { signOut } from "@/app/auth/logout/actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type HomeProps = {
  searchParams?: Promise<{
    auth_error?: string;
    auth_status?: string;
  }>;
};

const authErrorMessages: Record<string, string> = {
  callback_failed: "No se pudo completar el inicio de sesión con Google.",
  google_oauth_start_failed: "No se pudo iniciar el flujo de Google OAuth.",
  email_password_failed: "No se pudo completar la autenticación con email.",
  email_not_confirmed: "Debes confirmar tu email antes de iniciar sesión.",
  email_password_missing: "Ingresa email y contraseña para continuar.",
  invalid_credentials: "Email o contraseña inválidos.",
  invalid_password: "La contraseña no cumple los requisitos de Supabase Auth.",
  supabase_env_missing:
    "Faltan variables de entorno de Supabase. Configura .env.local para probar el login.",
  user_already_registered: "La cuenta ya existe. Intenta iniciar sesión.",
};

const authStatusMessages: Record<string, string> = {
  check_email:
    "Registro recibido. Revisa tu correo si Supabase requiere confirmación antes de iniciar sesión.",
};

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const authError = resolvedSearchParams?.auth_error;
  const authStatus = resolvedSearchParams?.auth_status;
  const isSupabaseConfigured = hasSupabaseEnv();
  const user = isSupabaseConfigured ? await getCurrentUser() : null;
  const displayName =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur md:grid-cols-[1.15fr_0.85fr] md:p-12">
          <div className="flex flex-col justify-between gap-10">
            <div className="space-y-6">
              <p className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100">
                Plataforma interna MYC
              </p>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-balance md:text-6xl">
                  Seguimiento de obras con acceso seguro.
                </h1>
                <p className="max-w-xl text-lg leading-8 text-neutral-300">
                  Autenticación con Supabase Auth: Google OAuth y cuenta propia
                  con email/password. Los módulos de clientes, obras y permisos
                  de negocio se implementarán después.
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-neutral-400 sm:grid-cols-3">
              <span className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Google OAuth disponible
              </span>
              <span className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Sesión con cookies SSR
              </span>
              <span className="rounded-2xl border border-white/10 bg-black/20 p-4">
                Email/password con Supabase
              </span>
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-white/10 bg-neutral-900/80 p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Acceso</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Usa Google o una cuenta propia del sistema. Supabase Auth crea y
                valida las sesiones sin manejar contraseñas en MYC.
              </p>
            </div>

            {authError ? (
              <div className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                {authErrorMessages[authError] ?? "Ocurrió un error de autenticación."}
              </div>
            ) : null}

            {authStatus ? (
              <div className="mb-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                {authStatusMessages[authStatus] ?? "Acción de autenticación completada."}
              </div>
            ) : null}

            {!isSupabaseConfigured ? (
              <div className="rounded-2xl border border-sky-300/30 bg-sky-300/10 p-4 text-sm leading-6 text-sky-100">
                Configura `NEXT_PUBLIC_SUPABASE_URL` y
                `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` para
                habilitar el login real.
              </div>
            ) : user ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                  <p className="text-sm text-emerald-100">Sesión activa</p>
                  <p className="mt-1 break-words text-lg font-medium">
                    {displayName}
                  </p>
                </div>
                <div className="grid gap-3">
                  <Link
                    href="/protected"
                    className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Ir a zona protegida
                  </Link>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <form action={signInWithGoogle}>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
                  >
                    Iniciar sesión o registrarse con Google
                  </button>
                  <p className="mt-3 text-center text-xs leading-5 text-neutral-500">
                    Google OAuth cubre login y alta inicial si el provider está configurado.
                  </p>
                </form>

                <div className="h-px bg-white/10" />

                <form action={signInWithPassword} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-400" htmlFor="login-email">
                      Email
                    </label>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300/60"
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-400" htmlFor="login-password">
                      Contraseña
                    </label>
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300/60"
                      placeholder="Tu contraseña"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full border border-emerald-300/40 bg-emerald-300/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
                  >
                    Iniciar sesión con email
                  </button>
                </form>

                <form action={signUpWithPassword} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-medium text-white">Crear cuenta con email</p>
                  <div>
                    <label className="text-xs font-medium text-neutral-400" htmlFor="signup-email">
                      Email
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300/60"
                      placeholder="usuario@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-400" htmlFor="signup-password">
                      Contraseña
                    </label>
                    <input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-emerald-300/60"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Registrarse con email
                  </button>
                  <p className="text-xs leading-5 text-neutral-500">
                    Supabase puede requerir confirmación por correo según la configuración del proyecto.
                  </p>
                </form>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
