import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrismaUser } from "@/lib/auth/types";

/**
 * Lista todos los usuarios internos (no eliminados) ordenados
 * por fecha de creacion descendente. Incluye todos los roles
 * excepto los marcados como eliminados.
 */
export async function listAllUsers(): Promise<PrismaUser[]> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Obtiene un usuario por su ID. Retorna null si no existe
 * o si esta eliminado.
 */
export async function getUserById(
  id: string,
): Promise<PrismaUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.deletedAt) {
    return null;
  }

  return user;
}
