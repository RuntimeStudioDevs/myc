import { requireAnyRole } from "@/lib/auth/guards";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import Link from "next/link";

export default async function EngineerDashboardPage() {
  const profile = await requireAnyRole(["super_admin", "ingeniero"]);
  const authUser = await getCurrentAuthUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Ingeniero</h1>
          <p className="text-neutral-500">Panel de ingenieria</p>
        </div>

        <div className="rounded border border-neutral-200 p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Email:</span> {authUser?.email}
          </div>
          <div>
            <span className="font-medium">Nombre:</span> {profile.name}
          </div>
          <div>
            <span className="font-medium">Rol:</span> {profile.role}
          </div>
          <div>
            <span className="font-medium">Activo:</span>{" "}
            {profile.active ? "Si" : "No"}
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Acceso para super_admin e ingeniero.
        </p>

        <Link
          href="/dashboard/clients"
          className="block w-full rounded bg-neutral-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-neutral-800"
        >
          Gestionar clientes
        </Link>

        <Link
          href="/dashboard/projects"
          className="block w-full rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium hover:bg-neutral-50"
        >
          Gestionar obras
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Cerrar sesion
          </button>
        </form>
      </div>
    </main>
  );
}
