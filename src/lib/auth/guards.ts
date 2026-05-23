import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
  getCurrentAuthUser,
  getCurrentUserProfile,
} from "@/lib/auth/session";
import type { PrismaUser, UserRole } from "@/lib/auth/types";

/**
 * Obtiene el rol del usuario actual desde su perfil de dominio.
 * Retorna null si no hay sesion o si el perfil no existe.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;
  return profile.role;
}

/**
 * Requiere que el usuario este autenticado.
 * Redirige a /login si no hay sesion activa.
 * Retorna datos basicos del usuario autenticado.
 */
export async function requireAuth(): Promise<{ id: string; email: string }> {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/login");
  }
  return { id: user.id, email: user.email ?? "" };
}

/**
 * Requiere que el usuario tenga un perfil de dominio activo.
 * Redirige a /login si no hay perfil o si esta inactivo.
 * Retorna el perfil completo.
 */
export async function requireActiveProfile(): Promise<PrismaUser> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  if (!profile.active) {
    redirect("/login?error=inactive");
  }

  return profile;
}

/**
 * Requiere que el usuario tenga un rol especifico.
 * Retorna 404 si el rol no coincide.
 */
export async function requireRole(role: UserRole): Promise<PrismaUser> {
  const profile = await requireActiveProfile();

  if (profile.role !== role) {
    notFound();
  }

  return profile;
}

/**
 * Requiere que el usuario tenga cualquiera de los roles indicados.
 * Retorna 404 si el rol no esta en la lista permitida.
 */
export async function requireAnyRole(roles: UserRole[]): Promise<PrismaUser> {
  const profile = await requireActiveProfile();

  if (!roles.includes(profile.role)) {
    notFound();
  }

  return profile;
}

/**
 * Requiere que el usuario sea super_admin.
 * Retorna 404 si no lo es.
 */
export async function requireSuperAdmin(): Promise<PrismaUser> {
  return requireRole("super_admin");
}
