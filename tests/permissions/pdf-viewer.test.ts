import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaUser } from "@/lib/auth/types";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      projectAssignment: {
        findFirst: vi.fn(),
      },
      projectFile: {
        findUnique: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import {
  canViewProjectFile,
  canUploadProjectFile,
  canDeleteProjectFile,
} from "@/lib/projects/files/queries";
import { canViewUpdateFile } from "@/lib/projects/updates/files/queries";

function profile(
  role: "super_admin" | "ingeniero" | "marketing" | "cliente",
): PrismaUser {
  const id = `user-${role}`;
  return {
    id,
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
    updateFiles: [],
  } as PrismaUser;
}

describe("canViewProjectFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede ver cualquier archivo de obra", async () => {
    const result = await canViewProjectFile(profile("super_admin"), "proj-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("ingeniero con asignacion activa puede ver archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "a",
    } as never);
    expect(
      await canViewProjectFile(profile("ingeniero"), "proj-1"),
    ).toBe(true);
  });

  it("ingeniero sin asignacion no puede ver archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(
      await canViewProjectFile(profile("ingeniero"), "proj-1"),
    ).toBe(false);
  });

  it("marketing con asignacion activa puede ver archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "a",
    } as never);
    expect(
      await canViewProjectFile(profile("marketing"), "proj-1"),
    ).toBe(true);
  });

  it("marketing sin asignacion no puede ver archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(
      await canViewProjectFile(profile("marketing"), "proj-1"),
    ).toBe(false);
  });

  it("cliente puede ver archivos de su propia obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      client: { userId: "user-cliente" },
    } as never);
    expect(
      await canViewProjectFile(profile("cliente"), "proj-1"),
    ).toBe(true);
  });

  it("cliente no puede ver archivos de obra ajena", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      client: { userId: "otro-cliente" },
    } as never);
    expect(
      await canViewProjectFile(profile("cliente"), "proj-1"),
    ).toBe(false);
  });

  it("cliente no puede ver archivos de obra inexistente", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
    expect(
      await canViewProjectFile(profile("cliente"), "proj-1"),
    ).toBe(false);
  });

  it("obra eliminada (deletedAt) no da acceso a cliente", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);
    expect(
      await canViewProjectFile(profile("cliente"), "proj-eliminada"),
    ).toBe(false);
  });
});

describe("canUploadProjectFile — sin cambios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede subir archivos", async () => {
    expect(
      await canUploadProjectFile(profile("super_admin"), "proj-1"),
    ).toBe(true);
  });

  it("cliente no puede subir archivos", async () => {
    expect(
      await canUploadProjectFile(profile("cliente"), "proj-1"),
    ).toBe(false);
  });
});

describe("canDeleteProjectFile — sin cambios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede eliminar cualquier archivo", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: null,
    } as never);
    expect(
      await canDeleteProjectFile(profile("super_admin"), "file-1"),
    ).toBe(true);
  });

  it("uploader puede eliminar su propio archivo", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: null,
    } as never);
    expect(
      await canDeleteProjectFile(profile("ingeniero"), "file-1"),
    ).toBe(true);
  });

  it("archivo eliminado no puede volver a eliminarse", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({
      uploadedBy: "user-ingeniero",
      deletedAt: new Date(),
    } as never);
    expect(
      await canDeleteProjectFile(profile("super_admin"), "file-1"),
    ).toBe(false);
  });
});

describe("canViewUpdateFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede ver archivos de actualizacion", async () => {
    expect(await canViewUpdateFile(profile("super_admin"), "proj-1")).toBe(
      true,
    );
  });

  it("ingeniero con asignacion activa puede ver archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "a",
    } as never);
    expect(
      await canViewUpdateFile(profile("ingeniero"), "proj-1"),
    ).toBe(true);
  });

  it("ingeniero sin asignacion no puede ver archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(
      await canViewUpdateFile(profile("ingeniero"), "proj-1"),
    ).toBe(false);
  });

  it("marketing con asignacion activa puede ver archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "a",
    } as never);
    expect(
      await canViewUpdateFile(profile("marketing"), "proj-1"),
    ).toBe(true);
  });

  it("marketing sin asignacion no puede ver archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(
      await canViewUpdateFile(profile("marketing"), "proj-1"),
    ).toBe(false);
  });

  it("cliente puede ver archivos de actualizacion de su obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      client: { userId: "user-cliente" },
    } as never);
    expect(
      await canViewUpdateFile(profile("cliente"), "proj-1"),
    ).toBe(true);
  });

  it("cliente no puede ver archivos de actualizacion de obra ajena", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      client: { userId: "otro-cliente" },
    } as never);
    expect(
      await canViewUpdateFile(profile("cliente"), "proj-1"),
    ).toBe(false);
  });
});
