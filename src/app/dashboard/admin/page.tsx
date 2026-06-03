import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { listAllUsers } from "@/lib/admin/users/queries";
import { listClients } from "@/lib/clients/queries";
import { listProjects } from "@/lib/projects/queries";

export default async function AdminDashboardPage() {
  const profile = await requireSuperAdmin();
  const authUser = await getCurrentAuthUser();

  const users = await listAllUsers();
  const clients = await listClients();
  const projects = await listProjects();

  const activeUsers = users.filter((u) => u.active).length;
  const activeClients = clients.filter((c) => c.user.active).length;
  const activeProjects = projects.filter(
    (p) => p.currentStatus !== "completado" && p.currentStatus !== "cancelado",
  ).length;
  const completedProjects = projects.filter(
    (p) => p.currentStatus === "completado" || p.currentStatus === "cancelado",
  ).length;

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de administracion</h1>
            <p className="text-sm text-neutral-500">
              Bienvenido, {profile.name}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Cerrar sesion
            </button>
          </form>
          <Link
            href="/dashboard/profile"
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Mi Perfil
          </Link>
        </div>

        <div className="rounded border border-neutral-200 p-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Email:</span> {authUser?.email}
          </div>
          <div>
            <span className="font-medium">Rol:</span> {profile.role}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-sm text-neutral-500">
              Usuarios ({activeUsers} activos)
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-2xl font-bold">{clients.length}</p>
            <p className="text-sm text-neutral-500">
              Clientes ({activeClients} activos)
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4">
            <p className="text-2xl font-bold">{activeProjects}</p>
            <p className="text-sm text-neutral-500">
              Obras activas ({completedProjects} finalizadas)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="rounded border border-neutral-200 p-6 hover:border-neutral-400 space-y-2"
          >
            <p className="font-medium">Usuarios</p>
            <p className="text-sm text-neutral-500">
              Crear, editar y administrar usuarios internos y clientes.
            </p>
            <p className="text-xs text-neutral-400 underline">
              Gestionar usuarios →
            </p>
          </Link>

          <Link
            href="/dashboard/clients"
            className="rounded border border-neutral-200 p-6 hover:border-neutral-400 space-y-2"
          >
            <p className="font-medium">Clientes</p>
            <p className="text-sm text-neutral-500">
              Ver y administrar todos los clientes registrados.
            </p>
            <p className="text-xs text-neutral-400 underline">
              Gestionar clientes →
            </p>
          </Link>

          <Link
            href="/dashboard/projects"
            className="rounded border border-neutral-200 p-6 hover:border-neutral-400 space-y-2"
          >
            <p className="font-medium">Obras</p>
            <p className="text-sm text-neutral-500">
              Ver, crear y administrar todas las obras activas.
            </p>
            <p className="text-xs text-neutral-400 underline">
              Gestionar obras →
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
