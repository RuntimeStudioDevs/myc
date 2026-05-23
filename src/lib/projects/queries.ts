import "server-only";

import { prisma } from "@/lib/prisma";

export type ProjectWithRelations = Awaited<
  ReturnType<typeof listProjects>
>[number];

/**
 * Lista obras no eliminadas. Filtra por asignacion si userId
 * es provisto (ingeniero o marketing). Si userId es undefined
 * (super_admin), muestra todas. Incluye cliente, ingeniero
 * principal y creador.
 */
export async function listProjects(userId?: string) {
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  // Si no es super_admin, filtrar por asignacion activa
  if (userId) {
    where.assignments = {
      some: {
        userId,
        unassignedAt: null,
      },
    };
  }

  return prisma.project.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          displayName: true,
          clientType: true,
        },
      },
      assignments: {
        where: {
          role: "ingeniero",
          isPrincipal: true,
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 1,
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Obtiene una obra por ID, con cliente y asignaciones.
 */
export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          displayName: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          assignedAt: "asc",
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Lista clientes activos (no eliminados) para formularios de seleccion.
 */
export async function listActiveClients() {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          active: true,
        },
      },
    },
    orderBy: {
      displayName: "asc",
    },
  });
}

/**
 * Lista ingenieros activos para asignacion como principal.
 */
export async function listActiveEngineers() {
  return prisma.user.findMany({
    where: {
      role: "ingeniero",
      active: true,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  });
}
