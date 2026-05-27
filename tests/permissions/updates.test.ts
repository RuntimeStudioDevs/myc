import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaUser } from "@/lib/auth/types";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => {
  const redirectError = (url: string) => {
    const err = new Error(`REDIRECT:${url}`);
    (err as Record<string, unknown>).digest = `NEXT_REDIRECT;${url}`;
    throw err;
  };
  return {
    redirect: vi.fn((url: string) => redirectError(url)),
    notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      projectUpdate: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      projectAssignment: {
        findFirst: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      projectStatusHistory: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  canCreateProjectUpdate,
  canEditProjectUpdate,
  canDeleteProjectUpdate,
} from "@/lib/projects/updates/queries";
import { deleteProjectUpdateAction } from "@/lib/projects/updates/actions";

function profile(role: "super_admin" | "ingeniero" | "marketing" | "cliente"): PrismaUser {
  return {
    id: `user-${role}`,
    name: `Test ${role}`,
    email: `${role}@test.local`,
    role,
    active: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: null,
    createdClients: [],
    createdProjects: [],
    updatedProjects: [],
    assignments: [],
    updates: [],
    uploadedFiles: [],
    statusHistories: [],
    updateComments: [],
    projectComments: [],
  } as PrismaUser;
}

// ---- canCreateProjectUpdate ----

describe("canCreateProjectUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingeniero con asignacion activa puede crear actualizaciones", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canCreateProjectUpdate(profile("ingeniero"), "proj-1");
    expect(result).toBe(true);
  });

  it("marketing con asignacion activa puede crear actualizaciones", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canCreateProjectUpdate(profile("marketing"), "proj-1");
    expect(result).toBe(true);
  });

  it("ingeniero sin asignacion no puede crear actualizaciones", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canCreateProjectUpdate(profile("ingeniero"), "proj-other");
    expect(result).toBe(false);
  });

  it("marketing sin asignacion no puede crear actualizaciones", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canCreateProjectUpdate(profile("marketing"), "proj-other");
    expect(result).toBe(false);
  });

  it("super_admin puede crear actualizaciones (control total)", async () => {
    const result = await canCreateProjectUpdate(profile("super_admin"), "proj-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("cliente no puede crear actualizaciones", async () => {
    const result = await canCreateProjectUpdate(profile("cliente"), "proj-1");
    expect(result).toBe(false);
  });
});

// ---- canEditProjectUpdate ----

describe("canEditProjectUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede editar cualquier actualizacion", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canEditProjectUpdate(profile("super_admin"), "up-1");
    expect(result).toBe(true);
  });

  it("autor puede editar su propia actualizacion", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canEditProjectUpdate(profile("ingeniero"), "up-1");
    expect(result).toBe(true);
  });

  it("usuario no autor no puede editar actualizacion ajena", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canEditProjectUpdate(profile("marketing"), "up-1");
    expect(result).toBe(false);
  });

  it("actualizacion eliminada no es editable", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: new Date(),
    } as never);
    const result = await canEditProjectUpdate(profile("super_admin"), "up-1");
    expect(result).toBe(false);
  });

  it("actualizacion inexistente retorna false", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue(null);
    const result = await canEditProjectUpdate(profile("ingeniero"), "missing");
    expect(result).toBe(false);
  });
});

// ---- canDeleteProjectUpdate ----

describe("canDeleteProjectUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede eliminar cualquier actualizacion", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-marketing",
      deletedAt: null,
    } as never);
    const result = await canDeleteProjectUpdate(profile("super_admin"), "up-1");
    expect(result).toBe(true);
  });

  it("autor puede eliminar su propia actualizacion", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-marketing",
      deletedAt: null,
    } as never);
    const result = await canDeleteProjectUpdate(profile("marketing"), "up-1");
    expect(result).toBe(true);
  });

  it("usuario no autor no puede eliminar actualizacion ajena", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canDeleteProjectUpdate(profile("marketing"), "up-1");
    expect(result).toBe(false);
  });

  it("actualizacion eliminada no puede volver a eliminarse", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: new Date(),
    } as never);
    const result = await canDeleteProjectUpdate(profile("ingeniero"), "up-1");
    expect(result).toBe(false);
  });
});

// ---- deleteProjectUpdateAction: reversion de progreso/estado ----

async function expectRedirect(promise: Promise<unknown>, expectedUrl: string) {
  try {
    await promise;
    throw new Error(`Expected redirect to ${expectedUrl} but no redirect occurred`);
  } catch (err) {
    const message = (err as Error).message;
    if (message.startsWith("REDIRECT:")) {
      expect(message).toBe(`REDIRECT:${expectedUrl}`);
    } else {
      throw err;
    }
  }
}

describe("deleteProjectUpdateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const activeProfile = {
    id: "user-super_admin",
    name: "Admin",
    email: "admin@test.local",
    role: "super_admin" as const,
    active: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: null,
    createdClients: [],
    createdProjects: [],
    updatedProjects: [],
    assignments: [],
    updates: [],
    uploadedFiles: [],
    statusHistories: [],
    updateComments: [],
    projectComments: [],
  };

  function runTransaction(cb: (tx: Record<string, unknown>) => Promise<void>) {
    const tx = { ...prisma };
    return cb(tx as never);
  }

  it("eliminar update con resultingProgress restaura currentProgress al valor previo", async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(activeProfile as never);

    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-1",
      projectId: "proj-1",
      deletedAt: null,
      resultingStatus: null,
      resultingProgress: 50,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<void>) => runTransaction(cb),
    );

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currentStatus: "en_progreso",
      currentProgress: 50,
    } as never);

    vi.mocked(prisma.projectStatusHistory.findFirst).mockResolvedValue({
      previousStatus: "planeacion",
      previousProgress: 0,
    } as never);

    vi.mocked(prisma.projectStatusHistory.create).mockResolvedValue({} as never);
    vi.mocked(prisma.project.update).mockResolvedValue({} as never);
    vi.mocked(prisma.projectUpdate.update).mockResolvedValue({} as never);

    const formData = new FormData();
    formData.set("updateId", "up-1");

    await expectRedirect(
      deleteProjectUpdateAction(formData),
      "/dashboard/projects/proj-1?update-deleted=true",
    );

    expect(prisma.projectUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "up-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj-1" },
        data: { currentStatus: "planeacion", currentProgress: 0 },
      }),
    );

    expect(prisma.projectStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          previousStatus: "en_progreso",
          newStatus: "planeacion",
          previousProgress: 50,
          newProgress: 0,
          changedBy: "user-super_admin",
          observation: "Actualizacion eliminada — progreso revertido",
        }),
      }),
    );
  });

  it("eliminar update con resultingStatus restaura currentStatus al valor previo", async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(activeProfile as never);

    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-2",
      projectId: "proj-1",
      deletedAt: null,
      resultingStatus: "en_progreso",
      resultingProgress: null,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<void>) => runTransaction(cb),
    );

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currentStatus: "en_progreso",
      currentProgress: 30,
    } as never);

    vi.mocked(prisma.projectStatusHistory.findFirst).mockResolvedValue({
      previousStatus: "planeacion",
      previousProgress: 30,
    } as never);

    vi.mocked(prisma.projectStatusHistory.create).mockResolvedValue({} as never);
    vi.mocked(prisma.project.update).mockResolvedValue({} as never);
    vi.mocked(prisma.projectUpdate.update).mockResolvedValue({} as never);

    const formData = new FormData();
    formData.set("updateId", "up-2");

    await expectRedirect(
      deleteProjectUpdateAction(formData),
      "/dashboard/projects/proj-1?update-deleted=true",
    );

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj-1" },
        data: { currentStatus: "planeacion", currentProgress: 30 },
      }),
    );
  });

  it("eliminar update con resultingProgress y resultingStatus restaura ambos", async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(activeProfile as never);

    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-3",
      projectId: "proj-1",
      deletedAt: null,
      resultingStatus: "en_progreso",
      resultingProgress: 40,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<void>) => runTransaction(cb),
    );

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      currentStatus: "en_progreso",
      currentProgress: 40,
    } as never);

    vi.mocked(prisma.projectStatusHistory.findFirst).mockResolvedValue({
      previousStatus: "planeacion",
      previousProgress: 0,
    } as never);

    vi.mocked(prisma.projectStatusHistory.create).mockResolvedValue({} as never);
    vi.mocked(prisma.project.update).mockResolvedValue({} as never);
    vi.mocked(prisma.projectUpdate.update).mockResolvedValue({} as never);

    const formData = new FormData();
    formData.set("updateId", "up-3");

    await expectRedirect(
      deleteProjectUpdateAction(formData),
      "/dashboard/projects/proj-1?update-deleted=true",
    );

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentStatus: "planeacion", currentProgress: 0 },
      }),
    );
  });

  it("eliminar update sin resultingProgress ni resultingStatus no modifica Project ni crea historial", async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(activeProfile as never);

    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-4",
      projectId: "proj-1",
      deletedAt: null,
      resultingStatus: null,
      resultingProgress: null,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<void>) => runTransaction(cb),
    );

    vi.mocked(prisma.projectUpdate.update).mockResolvedValue({} as never);

    const formData = new FormData();
    formData.set("updateId", "up-4");

    await expectRedirect(
      deleteProjectUpdateAction(formData),
      "/dashboard/projects/proj-1?update-deleted=true",
    );

    expect(prisma.project.findUnique).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(prisma.projectStatusHistory.create).not.toHaveBeenCalled();
  });

  it("eliminar update hace soft-delete (deletedAt, no DELETE fisico)", async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValue(activeProfile as never);

    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-5",
      projectId: "proj-1",
      deletedAt: null,
      resultingStatus: null,
      resultingProgress: null,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<void>) => runTransaction(cb),
    );

    vi.mocked(prisma.projectUpdate.update).mockResolvedValue({} as never);

    const formData = new FormData();
    formData.set("updateId", "up-5");

    await expectRedirect(
      deleteProjectUpdateAction(formData),
      "/dashboard/projects/proj-1?update-deleted=true",
    );

    expect(prisma.projectUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "up-5" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});
