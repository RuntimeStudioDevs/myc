import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaUser } from "@/lib/auth/types";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("@/lib/auth/guards", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    requireAnyRole: vi.fn(),
    requireSuperAdmin: vi.fn(),
  };
});

vi.mock("@/lib/projects/permissions", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    requireProjectWriteAccess: vi.fn(),
  };
});

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
      projectAssignment: {
        findFirst: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      client: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      projectStatusHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/guards";
import { requireProjectWriteAccess } from "@/lib/projects/permissions";
import {
  hasActiveProjectAssignment,
  canReadProject,
  canWriteProject,
} from "@/lib/projects/permissions";
import { createProjectAction, updateProjectAction } from "@/lib/projects/actions";

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

// ---- hasActiveProjectAssignment ----

describe("hasActiveProjectAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna true si existe asignacion activa", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await hasActiveProjectAssignment("user-1", "proj-1");
    expect(result).toBe(true);
  });

  it("retorna false si no existe asignacion activa", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await hasActiveProjectAssignment("user-1", "proj-1");
    expect(result).toBe(false);
  });
});

// ---- canReadProject ----

describe("canReadProject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede leer cualquier obra", async () => {
    const result = await canReadProject(profile("super_admin"), "proj-1");
    expect(result).toBe(true);
  });

  it("cliente no puede leer obras directamente", async () => {
    expect(await canReadProject(profile("cliente"), "proj-1")).toBe(false);
  });

  it("ingeniero asignado puede leer su obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canReadProject(profile("ingeniero"), "proj-1")).toBe(true);
  });

  it("ingeniero no asignado no puede leer obra ajena", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(await canReadProject(profile("ingeniero"), "proj-other")).toBe(false);
  });

  it("marketing asignado puede leer su obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canReadProject(profile("marketing"), "proj-1")).toBe(true);
  });

  it("marketing no asignado no puede leer obra ajena", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(await canReadProject(profile("marketing"), "proj-other")).toBe(false);
  });
});

// ---- canWriteProject ----

describe("canWriteProject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede escribir en cualquier obra", async () => {
    expect(await canWriteProject(profile("super_admin"), "proj-1")).toBe(true);
  });

  it("ingeniero asignado puede escribir en su obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canWriteProject(profile("ingeniero"), "proj-1")).toBe(true);
  });

  it("ingeniero no asignado no puede escribir en obra ajena", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(await canWriteProject(profile("ingeniero"), "proj-other")).toBe(false);
  });

  it("marketing no puede escribir en ninguna obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canWriteProject(profile("marketing"), "proj-1")).toBe(false);
  });

  it("cliente no puede escribir en obras", async () => {
    expect(await canWriteProject(profile("cliente"), "proj-1")).toBe(false);
  });
});

// ---- createProjectAction: validacion de fechas ----

async function expectRedirect(promise: Promise<unknown>, expectedUrl: string) {
  try {
    await promise;
    throw new Error(`Expected redirect to ${expectedUrl}`);
  } catch (err) {
    const message = (err as Error).message;
    if (message.startsWith("REDIRECT:")) {
      expect(message).toBe(`REDIRECT:${expectedUrl}`);
    } else {
      throw err;
    }
  }
}

describe("createProjectAction — validacion de fechas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza estimatedEndDate menor que startDate", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-super_admin",
      role: "super_admin",
      active: true,
    } as never);

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      deletedAt: null,
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "eng-1",
      role: "ingeniero",
      active: true,
      deletedAt: null,
    } as never);

    const fd = new FormData();
    fd.set("name", "Test Project");
    fd.set("clientId", "client-1");
    fd.set("engineerId", "eng-1");
    fd.set("startDate", "2026-06-15");
    fd.set("estimatedEndDate", "2026-06-10");

    await expectRedirect(
      createProjectAction(fd),
      "/dashboard/projects?error=invalid-dates",
    );
  });

  it("rechaza estimatedEndDate igual a startDate NO — fechas iguales son validas", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      deletedAt: null,
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "eng-1",
      role: "ingeniero",
      active: true,
      deletedAt: null,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = { ...prisma };
        return cb(tx as never);
      },
    );

    const fd = new FormData();
    fd.set("name", "Test Project");
    fd.set("clientId", "client-1");
    fd.set("engineerId", "eng-1");
    fd.set("startDate", "2026-06-15");
    fd.set("estimatedEndDate", "2026-06-15");

    let redirectUrl = "";
    try {
      await createProjectAction(fd);
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith("REDIRECT:")) {
        redirectUrl = message.replace("REDIRECT:", "");
      }
    }

    expect(redirectUrl).not.toContain("invalid-dates");
  });
});

// ---- updateProjectAction: validacion de fechas ----

describe("updateProjectAction — validacion de fechas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza estimatedEndDate menor que startDate (ambas vienen en el form)", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-super_admin",
      role: "super_admin",
      active: true,
    } as never);

    vi.mocked(requireProjectWriteAccess).mockResolvedValue(undefined);

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "proj-1",
      deletedAt: null,
      currentStatus: "planeacion",
      currentProgress: 0,
      archivedAt: null,
      startDate: null,
      estimatedEndDate: null,
    } as never);

    const fd = new FormData();
    fd.set("projectId", "proj-1");
    fd.set("name", "Test Project");
    fd.set("startDate", "2026-06-15");
    fd.set("estimatedEndDate", "2026-06-01");

    await expectRedirect(
      updateProjectAction(fd),
      "/dashboard/projects?error=invalid-dates",
    );
  });

  it("rechaza estimatedEndDate nueva menor que startDate existente del proyecto", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-super_admin",
      role: "super_admin",
      active: true,
    } as never);

    vi.mocked(requireProjectWriteAccess).mockResolvedValue(undefined);

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "proj-1",
      deletedAt: null,
      currentStatus: "planeacion",
      currentProgress: 0,
      archivedAt: null,
      startDate: new Date("2026-06-15"),
      estimatedEndDate: null,
    } as never);

    const fd = new FormData();
    fd.set("projectId", "proj-1");
    fd.set("name", "Test Project");
    fd.set("estimatedEndDate", "2026-06-01");

    await expectRedirect(
      updateProjectAction(fd),
      "/dashboard/projects?error=invalid-dates",
    );
  });

  it("rechaza startDate nueva mayor que estimatedEndDate existente del proyecto", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-super_admin",
      role: "super_admin",
      active: true,
    } as never);

    vi.mocked(requireProjectWriteAccess).mockResolvedValue(undefined);

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "proj-1",
      deletedAt: null,
      currentStatus: "planeacion",
      currentProgress: 0,
      archivedAt: null,
      startDate: null,
      estimatedEndDate: new Date("2026-06-01"),
    } as never);

    const fd = new FormData();
    fd.set("projectId", "proj-1");
    fd.set("name", "Test Project");
    fd.set("startDate", "2026-06-15");

    await expectRedirect(
      updateProjectAction(fd),
      "/dashboard/projects?error=invalid-dates",
    );
  });

  it("acepta fechas validas (end >= start)", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    vi.mocked(requireProjectWriteAccess).mockResolvedValue(undefined);

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "proj-1",
      deletedAt: null,
      currentStatus: "planeacion",
      currentProgress: 0,
      archivedAt: null,
      startDate: null,
      estimatedEndDate: null,
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(
      (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = { ...prisma };
        return cb(tx as never);
      },
    );

    const fd = new FormData();
    fd.set("projectId", "proj-1");
    fd.set("name", "Test Project");
    fd.set("startDate", "2026-06-10");
    fd.set("estimatedEndDate", "2026-06-30");

    let redirectUrl = "";
    try {
      await updateProjectAction(fd);
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith("REDIRECT:")) {
        redirectUrl = message.replace("REDIRECT:", "");
      }
    }

    expect(redirectUrl).not.toContain("invalid-dates");
  });
});
