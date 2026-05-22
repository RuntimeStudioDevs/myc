"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  if (!hasSupabaseEnv()) {
    redirect("/?auth_error=supabase_env_missing");
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/protected`,
    },
  });

  if (error || !data.url) {
    redirect("/?auth_error=google_oauth_start_failed");
  }

  redirect(data.url);
}

export async function signInWithPassword(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/?auth_error=supabase_env_missing");
  }

  const credentials = getPasswordCredentials(formData);

  if (!credentials) {
    redirect("/?auth_error=email_password_missing");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect(`/?auth_error=${encodeURIComponent(mapPasswordAuthError(error.message))}`);
  }

  redirect("/protected");
}

export async function signUpWithPassword(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/?auth_error=supabase_env_missing");
  }

  const credentials = getPasswordCredentials(formData);

  if (!credentials) {
    redirect("/?auth_error=email_password_missing");
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/protected`,
    },
  });

  if (error) {
    redirect(`/?auth_error=${encodeURIComponent(mapPasswordAuthError(error.message))}`);
  }

  if (data.session) {
    redirect("/protected");
  }

  redirect("/?auth_status=check_email");
}

function getPasswordCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return null;
  }

  return {
    email: trimmedEmail,
    password,
  };
}

function mapPasswordAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "invalid_credentials";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "email_not_confirmed";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "user_already_registered";
  }

  if (normalizedMessage.includes("password")) {
    return "invalid_password";
  }

  return "email_password_failed";
}
