"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return redirect("/login?error=missing-fields");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return redirect("/register?error=missing-fields");
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? headersList.get("host") ?? "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/dashboard`,
    },
  });

  if (error) {
    return redirect("/register?error=" + encodeURIComponent(error.message));
  }

  // Esperar a que el trigger cree el perfil de dominio
  if (data.user) {
    const supabaseAdmin = createAdminClient();
    for (let i = 0; i < 5; i++) {
      const { data: profile } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  redirect("/login?registered=true");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return redirect("/forgot-password?error=" + encodeURIComponent("El email es obligatorio."));
  }

  if (!email.includes("@") || !email.includes(".")) {
    return redirect("/forgot-password?error=" + encodeURIComponent("El formato del email no es valido."));
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? headersList.get("host") ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return redirect("/forgot-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/forgot-password?email-sent=true");
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return redirect("/reset-password?error=" + encodeURIComponent("Ambos campos son obligatorios."));
  }

  if (password.length < 8) {
    return redirect("/reset-password?error=" + encodeURIComponent("La contrasena debe tener al menos 8 caracteres."));
  }

  if (password !== confirmPassword) {
    return redirect("/reset-password?error=" + encodeURIComponent("Las contrasenas no coinciden."));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return redirect("/reset-password?error=" + encodeURIComponent(error.message));
  }

  redirect("/login?password-reset=true");
}
