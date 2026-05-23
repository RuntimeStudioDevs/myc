import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth/guards";
import { signOutAction } from "@/lib/auth/actions";

export default async function DashboardPage() {
  const role = await getCurrentUserRole();

  if (!role) {
    redirect("/login");
  }

  const roleRoutes: Record<string, string> = {
    super_admin: "/dashboard/admin",
    ingeniero: "/dashboard/engineer",
    marketing: "/dashboard/marketing",
    cliente: "/dashboard/client",
  };

  const target = roleRoutes[role];
  if (target) {
    redirect(target);
  }

  // Fallback: si el rol no esta en el mapa, mostrar pagina generica
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-neutral-500">Rol no reconocido: {role}</p>
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
