import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaUser } from "@/lib/auth/types";

// ---- Mock Prisma ----

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      projectComment: {
        findUnique: vi.fn(),
      },
      updateComment: {
        findUnique: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
      projectUpdate: {
        findUnique: vi.fn(),
      },
      projectAssignment: {
        findFirst: vi.fn(),
      },
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import {
  canEditProjectComment,
  canCreateProjectComment,
} from "@/lib/projects/comments/queries";
import {
  canEditUpdateComment,
  canCreateUpdateComment,
} from "@/lib/projects/updates/comments/queries";

// ---- Helpers ----

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

function comment(authorId: string, deletedAt: Date | null = null) {
  return { authorId, deletedAt };
}

// ---- canEditProjectComment ----

describe("canEditProjectComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin can edit any comment", async () => {
    vi.mocked(prisma.projectComment.findUnique).mockResolvedValue(
      comment("user-ingeniero"),
    );
    const result = await canEditProjectComment(
      profile("super_admin"),
      "comment-1",
    );
    expect(result).toBe(true);
    expect(prisma.projectComment.findUnique).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      select: { authorId: true, deletedAt: true },
    });
  });

  it("autor puede editar su propio comentario", async () => {
    vi.mocked(prisma.projectComment.findUnique).mockResolvedValue(
      comment("user-ingeniero"),
    );
    const result = await canEditProjectComment(
      profile("ingeniero"),
      "comment-1",
    );
    expect(result).toBe(true);
  });

  it("usuario no autor no puede editar comentario ajeno", async () => {
    vi.mocked(prisma.projectComment.findUnique).mockResolvedValue(
      comment("user-marketing"),
    );
    const result = await canEditProjectComment(
      profile("ingeniero"),
      "comment-1",
    );
    expect(result).toBe(false);
  });

  it("comentario eliminado no es editable", async () => {
    vi.mocked(prisma.projectComment.findUnique).mockResolvedValue(
      comment("user-ingeniero", new Date()),
    );
    const result = await canEditProjectComment(
      profile("super_admin"),
      "comment-1",
    );
    expect(result).toBe(false);
  });

  it("comentario inexistente retorna false", async () => {
    vi.mocked(prisma.projectComment.findUnique).mockResolvedValue(null);
    const result = await canEditProjectComment(
      profile("ingeniero"),
      "missing",
    );
    expect(result).toBe(false);
  });
});

// ---- canCreateProjectComment ----

describe("canCreateProjectComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede comentar en cualquier obra", async () => {
    const result = await canCreateProjectComment(
      profile("super_admin"),
      "project-1",
    );
    expect(result).toBe(true);
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it("cliente puede comentar en su propia obra", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-1",
      deletedAt: null,
      client: { userId: "user-cliente" },
    } as never);
    const result = await canCreateProjectComment(
      profile("cliente"),
      "project-1",
    );
    expect(result).toBe(true);
  });

  it("cliente no puede comentar en obra ajena", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-1",
      deletedAt: null,
      client: { userId: "user-other" },
    } as never);
    const result = await canCreateProjectComment(
      profile("cliente"),
      "project-1",
    );
    expect(result).toBe(false);
  });

  it("ingeniero asignado puede comentar en su obra", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-1",
      deletedAt: null,
      client: { userId: "user-cliente" },
    } as never);
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canCreateProjectComment(
      profile("ingeniero"),
      "project-1",
    );
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).toHaveBeenCalledWith({
      where: { projectId: "project-1", userId: "user-ingeniero", unassignedAt: null },
    });
  });

  it("ingeniero no asignado no puede comentar", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-1",
      deletedAt: null,
      client: { userId: "user-cliente" },
    } as never);
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canCreateProjectComment(
      profile("ingeniero"),
      "project-1",
    );
    expect(result).toBe(false);
  });

  it("obra eliminada no acepta comentarios", async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "project-1",
      deletedAt: new Date(),
      client: { userId: "user-cliente" },
    } as never);
    const result = await canCreateProjectComment(
      profile("cliente"),
      "project-1",
    );
    expect(result).toBe(false);
  });
});

// ---- canEditUpdateComment ----

describe("canEditUpdateComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede editar cualquier comentario de actualizacion", async () => {
    vi.mocked(prisma.updateComment.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canEditUpdateComment(profile("super_admin"), "uc-1");
    expect(result).toBe(true);
  });

  it("autor puede editar su propio comentario de actualizacion", async () => {
    vi.mocked(prisma.updateComment.findUnique).mockResolvedValue({
      authorId: "user-marketing",
      deletedAt: null,
    } as never);
    const result = await canEditUpdateComment(profile("marketing"), "uc-1");
    expect(result).toBe(true);
  });

  it("usuario no autor no puede editar comentario de actualizacion ajeno", async () => {
    vi.mocked(prisma.updateComment.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canEditUpdateComment(profile("cliente"), "uc-1");
    expect(result).toBe(false);
  });

  it("comentario de actualizacion eliminado no es editable", async () => {
    vi.mocked(prisma.updateComment.findUnique).mockResolvedValue({
      authorId: "user-ingeniero",
      deletedAt: new Date(),
    } as never);
    const result = await canEditUpdateComment(profile("super_admin"), "uc-1");
    expect(result).toBe(false);
  });
});

// ---- canCreateUpdateComment ----

describe("canCreateUpdateComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede comentar en cualquier actualizacion", async () => {
    const result = await canCreateUpdateComment(profile("super_admin"), "up-1");
    expect(result).toBe(true);
    expect(prisma.projectUpdate.findUnique).not.toHaveBeenCalled();
  });

  it("cliente puede comentar en actualizacion de su obra", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-1",
      deletedAt: null,
      project: {
        id: "project-1",
        client: { userId: "user-cliente" },
      },
    } as never);
    const result = await canCreateUpdateComment(profile("cliente"), "up-1");
    expect(result).toBe(true);
  });

  it("staff asignado puede comentar en actualizacion", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-1",
      deletedAt: null,
      project: {
        id: "project-1",
        client: { userId: "user-cliente" },
      },
    } as never);
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canCreateUpdateComment(profile("ingeniero"), "up-1");
    expect(result).toBe(true);
  });

  it("staff no asignado no puede comentar en actualizacion", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-1",
      deletedAt: null,
      project: {
        id: "project-1",
        client: { userId: "user-cliente" },
      },
    } as never);
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canCreateUpdateComment(profile("marketing"), "up-1");
    expect(result).toBe(false);
  });

  it("actualizacion eliminada no acepta comentarios", async () => {
    vi.mocked(prisma.projectUpdate.findUnique).mockResolvedValue({
      id: "up-1",
      deletedAt: new Date(),
      project: {
        id: "project-1",
        client: { userId: "user-cliente" },
      },
    } as never);
    const result = await canCreateUpdateComment(profile("ingeniero"), "up-1");
    expect(result).toBe(false);
  });
});
