"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export async function createClientAction(formData: FormData) {
  const currentProfile = await requireAnyRole(["super_admin", "ingeniero"]);

  const displayName = formData.get("displayName") as string;
  const clientType = formData.get("clientType") as string;
  const phone = formData.get("phone") as string;
  const document = formData.get("document") as string;
  const address = formData.get("address") as string;
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  if (!displayName || !clientType || !email || !name || !password) {
    return redirect("/dashboard/clients?error=missing-fields");
  }

  if (clientType !== "persona" && clientType !== "empresa") {
    return redirect("/dashboard/clients?error=invalid-client-type");
  }

  // Crear usuario en Supabase Auth
  const supabaseAdmin = createAdminClient();

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

  if (authError || !authData.user) {
    const message = authError?.message ?? "unknown-error";
    return redirect(
      "/dashboard/clients?error=" + encodeURIComponent(message),
    );
  }

  const userId = authData.user.id;

  // Verificar que el trigger creo el perfil con rol cliente
  const profile = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!profile || profile.role !== "cliente") {
    return redirect("/dashboard/clients?error=profile-sync-failed");
  }

  // Crear registro de cliente
  await prisma.client.create({
    data: {
      clientType: clientType as "persona" | "empresa",
      displayName,
      phone: phone || null,
      document: document || null,
      address: address || null,
      userId,
      createdBy: currentProfile.id,
    },
  });

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?created=true");
}

export async function updateClientAction(formData: FormData) {
  await requireAnyRole(["super_admin", "ingeniero"]);

  const clientId = formData.get("clientId") as string;
  const displayName = formData.get("displayName") as string;
  const clientType = formData.get("clientType") as string;
  const phone = formData.get("phone") as string;
  const document = formData.get("document") as string;
  const address = formData.get("address") as string;

  if (!clientId || !displayName || !clientType) {
    return redirect("/dashboard/clients?error=missing-fields");
  }

  if (clientType !== "persona" && clientType !== "empresa") {
    return redirect("/dashboard/clients?error=invalid-client-type");
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client || client.deletedAt) {
    return redirect("/dashboard/clients?error=client-not-found");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: {
      displayName,
      clientType: clientType as "persona" | "empresa",
      phone: phone || null,
      document: document || null,
      address: address || null,
    },
  });

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?updated=true");
}

export async function deactivateClientAction(formData: FormData) {
  await requireAnyRole(["super_admin", "ingeniero"]);

  const clientId = formData.get("clientId") as string;

  if (!clientId) {
    return redirect("/dashboard/clients?error=missing-fields");
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client || client.deletedAt) {
    return redirect("/dashboard/clients?error=client-not-found");
  }

  // Soft delete del cliente (LORE.md exige soft delete para clientes)
  await prisma.client.update({
    where: { id: clientId },
    data: { deletedAt: new Date() },
  });

  // Desactivar perfil del usuario asociado
  await prisma.user.update({
    where: { id: client.userId },
    data: { active: false },
  });

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?deactivated=true");
}
