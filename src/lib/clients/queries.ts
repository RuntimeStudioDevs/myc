import "server-only";

import { prisma } from "@/lib/prisma";

export type ClientWithUser = Awaited<ReturnType<typeof listClients>>[number];

/**
 * Lista todos los clientes no eliminados, incluyendo el email
 * del usuario asociado. Ordenados por fecha de creacion descendente.
 *
 * @param onlyActiveUsers — si es true, excluye clientes cuyo usuario
 *   vinculado este inactivo (user.active === false).
 */
export async function listClients(onlyActiveUsers = false) {
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (onlyActiveUsers) {
    where.user = { active: true };
  }

  return prisma.client.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Obtiene un cliente por ID. Retorna null si no existe
 * o si esta eliminado.
 */
export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
        },
      },
    },
  });

  if (!client || client.deletedAt) {
    return null;
  }

  return client;
}

/**
 * Obtiene el cliente asociado al usuario autenticado.
 * Retorna null si el usuario no es cliente o si el registro
 * de cliente esta eliminado.
 */
export async function getClientByUserId(userId: string) {
  const client = await prisma.client.findUnique({
    where: { userId },
  });

  if (!client || client.deletedAt) {
    return null;
  }

  return client;
}
