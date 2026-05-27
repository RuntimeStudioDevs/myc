import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaUser } from "@/lib/auth/types";

// ---- Mock Prisma ----

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      projectAssignment: {
        findFirst: vi.fn(),
      },
      projectFile: {
        findUnique: vi.fn(),
      },
      updateFile: {
        findUnique: vi.fn(),
      },
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import {
  canUploadProjectFile,
  canDeleteProjectFile,
} from "@/lib/projects/files/queries";
import {
  canUploadUpdateFile,
  canDeleteUpdateFile,
} from "@/lib/projects/updates/files/queries";

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

// ---- canUploadProjectFile ----

describe("canUploadProjectFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede subir archivos", async () => {
    const result = await canUploadProjectFile(profile("super_admin"), "proj-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("cliente no puede subir archivos", async () => {
    const result = await canUploadProjectFile(profile("cliente"), "proj-1");
    expect(result).toBe(false);
    expect(prisma.projectAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("ingeniero asignado puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canUploadProjectFile(profile("ingeniero"), "proj-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).toHaveBeenCalledWith({
      where: { projectId: "proj-1", userId: "user-ingeniero", unassignedAt: null },
    });
  });

  it("ingeniero no asignado no puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canUploadProjectFile(profile("ingeniero"), "proj-1");
    expect(result).toBe(false);
  });

  it("marketing asignado puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canUploadProjectFile(profile("marketing"), "proj-1");
    expect(result).toBe(true);
  });

  it("marketing no asignado no puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canUploadProjectFile(profile("marketing"), "proj-1");
    expect(result).toBe(false);
  });
});

// ---- canDeleteProjectFile ----

describe("canDeleteProjectFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede eliminar cualquier archivo", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canDeleteProjectFile(profile("super_admin"), "file-1");
    expect(result).toBe(true);
  });

  it("uploader puede eliminar su propio archivo", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canDeleteProjectFile(profile("ingeniero"), "file-1");
    expect(result).toBe(true);
  });

  it("usuario no autor no puede eliminar archivo ajeno", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: null,
    } as never);
    const result = await canDeleteProjectFile(profile("marketing"), "file-1");
    expect(result).toBe(false);
  });

  it("archivo eliminado no puede volver a eliminarse", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: new Date(),
    } as never);
    const result = await canDeleteProjectFile(profile("super_admin"), "file-1");
    expect(result).toBe(false);
  });

  it("archivo inexistente retorna false", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue(null);
    const result = await canDeleteProjectFile(profile("ingeniero"), "missing");
    expect(result).toBe(false);
  });
});

// ---- canUploadUpdateFile ----

describe("canUploadUpdateFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede subir archivos de actualizacion", async () => {
    const result = await canUploadUpdateFile(profile("super_admin"), "proj-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("cliente no puede subir archivos de actualizacion", async () => {
    const result = await canUploadUpdateFile(profile("cliente"), "proj-1");
    expect(result).toBe(false);
  });

  it("staff asignado puede subir archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await canUploadUpdateFile(profile("ingeniero"), "proj-1");
    expect(result).toBe(true);
  });

  it("staff no asignado no puede subir archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await canUploadUpdateFile(profile("marketing"), "proj-1");
    expect(result).toBe(false);
  });
});

// ---- canDeleteUpdateFile ----

describe("canDeleteUpdateFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin puede eliminar cualquier archivo de actualizacion", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    const result = await canDeleteUpdateFile(profile("super_admin"), "ufile-1");
    expect(result).toBe(true);
  });

  it("autor de la actualizacion asociada puede eliminar archivo", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    const result = await canDeleteUpdateFile(profile("ingeniero"), "ufile-1");
    expect(result).toBe(true);
  });

  it("usuario no autor no puede eliminar archivo de actualizacion ajeno", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    const result = await canDeleteUpdateFile(profile("marketing"), "ufile-1");
    expect(result).toBe(false);
  });

  it("archivo asociado a actualizacion eliminada no es eliminable", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      update: { authorId: "user-ingeniero", deletedAt: new Date() },
    } as never);
    const result = await canDeleteUpdateFile(profile("super_admin"), "ufile-1");
    expect(result).toBe(false);
  });

  it("archivo de actualizacion inexistente retorna false", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue(null);
    const result = await canDeleteUpdateFile(profile("ingeniero"), "missing");
    expect(result).toBe(false);
  });
});
