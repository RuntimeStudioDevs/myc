"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  generateVerificationCode,
  hashVerificationCode,
  verifyCodeHash,
  getCodeExpiry,
} from "@/lib/profile/code-utils";
import { sendVerificationCode } from "@/lib/profile/email-sender";

async function requireOwnActiveProfile() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login?error=inactive");
  }
  if (!profile.active) {
    redirect("/login?error=inactive");
  }
  return profile;
}

export async function updateOwnPasswordAction(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("Ambos campos son obligatorios."));
  }

  if (password.length < 8) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("La contrasena debe tener al menos 8 caracteres."));
  }

  if (password !== confirmPassword) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("Las contrasenas no coinciden."));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent(error.message));
  }

  redirect("/dashboard/profile?password-updated=true");
}

export async function requestEmailChangeAction(formData: FormData) {
  const profile = await requireOwnActiveProfile();

  const email = formData.get("email") as string;
  const currentPassword = formData.get("currentPassword") as string;

  if (!email) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("El email es obligatorio."));
  }

  if (!email.includes("@") || !email.includes(".")) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("El formato del email no es valido."));
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === profile.email.toLowerCase()) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("El nuevo email debe ser diferente al actual."));
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null },
    select: { id: true },
  });

  if (existingUser) {
    return redirect("/dashboard/profile?error=" + encodeURIComponent("El email ya esta en uso por otra cuenta."));
  }

  if (!currentPassword) {
    return redirect("/dashboard/profile?error=password-required");
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });

  if (signInError) {
    return redirect("/dashboard/profile?error=invalid-password");
  }

  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = getCodeExpiry(10);

  await prisma.emailChangeRequest.updateMany({
    where: { userId: profile.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailChangeRequest.create({
    data: {
      userId: profile.id,
      newEmail: normalizedEmail,
      codeHash,
      expiresAt,
    },
  });

  try {
    sendVerificationCode(normalizedEmail, code);
  } catch (e) {
    console.error("[MYC-EMAIL] Failed to send:", e instanceof Error ? e.message : String(e));
    return redirect("/dashboard/profile?error=" + encodeURIComponent("No se pudo enviar el codigo. Intenta de nuevo."));
  }

  redirect("/dashboard/profile/verify-email?sent=true");
}

export async function verifyEmailChangeAction(formData: FormData) {
  const profile = await requireOwnActiveProfile();

  const code = formData.get("code") as string;

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return redirect("/dashboard/profile/verify-email?error=" + encodeURIComponent("El codigo debe tener 6 digitos."));
  }

  const request = await prisma.emailChangeRequest.findFirst({
    where: {
      userId: profile.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!request) {
    return redirect("/dashboard/profile/verify-email?error=" + encodeURIComponent("No tienes una solicitud activa o el codigo expiro."));
  }

  if (request.attempts >= 5) {
    return redirect("/dashboard/profile/verify-email?error=" + encodeURIComponent("Demasiados intentos. Solicita un nuevo codigo."));
  }

  if (!verifyCodeHash(code, request.codeHash)) {
    await prisma.emailChangeRequest.update({
      where: { id: request.id },
      data: { attempts: request.attempts + 1 },
    });
    return redirect("/dashboard/profile/verify-email?error=" + encodeURIComponent("Codigo incorrecto. Intentalo de nuevo."));
  }

  const supabaseAdmin = createAdminClient();
  const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(
    profile.id,
    { email: request.newEmail },
  );

  if (adminError) {
    console.error("[MYC-EMAIL] Admin API update failed:", adminError.message);
    return redirect("/dashboard/profile/verify-email?error=" + encodeURIComponent("Error al actualizar el email. Intenta de nuevo."));
  }

  await prisma.user.update({
    where: { id: profile.id },
    data: { email: request.newEmail },
  });

  await prisma.emailChangeRequest.update({
    where: { id: request.id },
    data: { usedAt: new Date() },
  });

  redirect("/dashboard/profile?email-updated=true");
}
