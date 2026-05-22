import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/logout/actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedPage() {
  if (!hasSupabaseEnv()) {
    redirect("/?auth_error=supabase_env_missing");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email;
  const userRole = user?.app_metadata?.role === "admin" ? "admin" : null;
  const roleLabel = userRole === "admin" ? "Administrador" : "Usuario autenticado";

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 md:p-10">
          <p className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100">
            Ruta protegida
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Sesión validada en servidor
          </h1>
          <p className="mt-4 text-neutral-300">
            El usuario autenticado es {displayName ?? "una cuenta sin nombre visible"}.
          </p>
          <div className="mt-4 w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100">
            {roleLabel}
          </div>
          {/* Roles y permisos de MYC se implementarán en una tarea posterior. */}
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-neutral-400">
            Esta pantalla solo comprueba autenticación. No incluye roles,
            perfiles, autorización por obra asignada ni modelos de negocio.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
            >
              Volver al inicio
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
