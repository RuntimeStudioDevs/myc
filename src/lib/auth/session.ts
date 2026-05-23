import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User as PrismaUser } from "@/generated/prisma/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Obtiene la sesion actual de Supabase Auth.
 * Usable en Server Components, Route Handlers y Server Actions.
 * Retorna null si no hay sesion activa.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Obtiene el usuario autenticado actual desde Supabase Auth.
 * Usable en Server Components, Route Handlers y Server Actions.
 * Retorna null si no hay usuario autenticado.
 *
 * El objeto User contiene id (UUID), email, y metadatos de Supabase Auth.
 * Para obtener el perfil de dominio (rol, nombre, activo), usar
 * getCurrentUserProfile().
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Obtiene el perfil de dominio desde public.usuarios usando
 * el id del usuario autenticado en Supabase Auth.
 *
 * Usable en Server Components, Route Handlers y Server Actions.
 * Retorna null si no hay sesion o si el perfil no existe aun
 * (ej. trigger de sincronizacion pendiente).
 */
export async function getCurrentUserProfile(): Promise<PrismaUser | null> {
  const user = await getCurrentAuthUser();

  if (!user) {
    return null;
  }

  try {
    return await prisma.user.findUnique({
      where: { id: user.id },
    });
  } catch {
    return null;
  }
}
