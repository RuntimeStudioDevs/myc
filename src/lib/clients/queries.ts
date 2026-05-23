import "server-only";

import { prisma } from "@/lib/prisma";

export type ClientWithUser = Awaited<ReturnType<typeof listClients>>[number];

/**
 * Lista todos los clientes no eliminados, incluyendo el email
 * del usuario asociado. Ordenados por fecha de creacion descendente.
 */
export async function listClients() {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
    },
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
