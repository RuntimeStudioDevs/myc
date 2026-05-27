import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth/guards";

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

  redirect("/login?error=unknown-role");
}
