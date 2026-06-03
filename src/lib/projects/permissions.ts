import "server-only";

import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { PrismaUser, UserRole } from "@/lib/auth/types";

/**
 * Verifica si un usuario tiene asignacion activa a una obra.
 * La asignacion es activa si unassignedAt es null.
 */
export async function hasActiveProjectAssignment(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId,
      unassignedAt: null,
    },
  });

  return assignment !== null;
}

/**
 * Verifica si el usuario actual puede leer una obra especifica.
 * super_admin: siempre.
 * ingeniero o marketing: solo con asignacion activa.
 * cliente: nunca (bloqueado antes).
 */
export async function canReadProject(
  profile: PrismaUser,
  projectId: string,
): Promise<boolean> {
  if (profile.role === "super_admin") return true;
  if (profile.role === "cliente") {
    const project = await prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      select: { client: { select: { userId: true } } },
    });
    return project?.client?.userId === profile.id;
  }

  return hasActiveProjectAssignment(profile.id, projectId);
}

/**
 * Verifica si el usuario actual puede escribir (editar/archivar) una obra.
 * super_admin: siempre.
 * ingeniero: solo con asignacion activa.
 * marketing: nunca.
 * cliente: nunca.
 */
export async function canWriteProject(
  profile: PrismaUser,
  projectId: string,
): Promise<boolean> {
  if (profile.role === "super_admin") return true;
  if (profile.role === "ingeniero") {
    return hasActiveProjectAssignment(profile.id, projectId);
  }
  return false;
}

/**
 * Obtiene el perfil y el ID del usuario para filtrar queries.
 * Retorna el ID del usuario para filtrado, o undefined si super_admin
 * (para que vea todas las obras).
 */
export async function getAssignmentFilter(): Promise<{
  profile: PrismaUser;
  userId: string | undefined;
}> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  if (!profile.active) {
    redirect("/login?error=inactive");
  }

  if (profile.role === "cliente") {
    redirect("/dashboard/client");
  }

  // super_admin ve todo, los demas filtran por asignacion
  const userId =
    profile.role === "super_admin" ? undefined : profile.id;

  return { profile, userId };
}

/**
 * Requiere acceso de escritura a una obra. Si no tiene permiso,
 * redirige con notFound() o redirect segun el caso.
 */
export async function requireProjectWriteAccess(
  profile: PrismaUser,
  projectId: string,
): Promise<void> {
  const canWrite = await canWriteProject(profile, projectId);

  if (!canWrite) {
    notFound();
  }
}

/**
 * Verifica si el rol puede escribir obras (en general, no especifica).
 */
export function isRoleWithWriteAccess(role: UserRole): boolean {
  return role === "super_admin" || role === "ingeniero";
}
