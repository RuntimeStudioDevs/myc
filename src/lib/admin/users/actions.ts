"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/auth/types";

const INTERNAL_ROLES: UserRole[] = ["ingeniero", "marketing"];

function isValidInternalRole(role: string): role is UserRole {
  return INTERNAL_ROLES.includes(role as UserRole);
}

export async function createInternalUserAction(formData: FormData) {
  await requireSuperAdmin();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return redirect("/dashboard/admin/users?error=missing-fields");
  }

  if (!isValidInternalRole(role)) {
    return redirect("/dashboard/admin/users?error=invalid-role");
  }

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error || !data.user) {
    const message = error?.message ?? "unknown-error";
    return redirect(
      "/dashboard/admin/users?error=" + encodeURIComponent(message),
    );
  }

  const userId = data.user.id;

  // El trigger tr_sync_auth_user_profile crea el perfil con rol 'cliente'.
  // Actualizamos el rol inmediatamente al rol interno elegido.
  await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole },
  });

  revalidatePath("/dashboard/admin/users");
  redirect("/dashboard/admin/users?created=true");
}

export async function updateInternalUserAction(formData: FormData) {
  const currentProfile = await requireSuperAdmin();
  const currentUserId = currentProfile.id;

  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const active = formData.get("active") as string;

  if (!userId || !name || !role) {
    return redirect("/dashboard/admin/users?error=missing-fields");
  }

  if (!isValidInternalRole(role)) {
    return redirect("/dashboard/admin/users?error=invalid-role");
  }

  // No permitir auto-modificacion
  if (userId === currentUserId) {
    return redirect("/dashboard/admin/users?error=cannot-self-edit");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!targetUser) {
    return redirect("/dashboard/admin/users?error=user-not-found");
  }

  // No permitir editar super_admin ni cliente
  if (targetUser.role === "super_admin" || targetUser.role === "cliente") {
    return redirect("/dashboard/admin/users?error=cannot-edit-role");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      role: role as UserRole,
      active: active === "true",
    },
  });

  revalidatePath("/dashboard/admin/users");
  redirect("/dashboard/admin/users?updated=true");
}

export async function deactivateInternalUserAction(formData: FormData) {
  const currentProfile = await requireSuperAdmin();
  const currentUserId = currentProfile.id;

  const userId = formData.get("userId") as string;

  if (!userId) {
    return redirect("/dashboard/admin/users?error=missing-fields");
  }

  // No permitir auto-desactivacion
  if (userId === currentUserId) {
    return redirect("/dashboard/admin/users?error=cannot-self-deactivate");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!targetUser) {
    return redirect("/dashboard/admin/users?error=user-not-found");
  }

  // No permitir desactivar super_admin
  if (targetUser.role === "super_admin") {
    return redirect("/dashboard/admin/users?error=cannot-deactivate-admin");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: false },
  });

  revalidatePath("/dashboard/admin/users");
  redirect("/dashboard/admin/users?deactivated=true");
}
