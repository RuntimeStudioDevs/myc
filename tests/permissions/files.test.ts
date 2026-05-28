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
    updateFiles: [],
  } as PrismaUser;
}

// ---- canUploadProjectFile ----

describe("canUploadProjectFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede subir archivos", async () => {
    const result = await canUploadProjectFile(profile("super_admin"), "proj-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).not.toHaveBeenCalled();
  });

  it("cliente no puede subir archivos", async () => {
    const result = await canUploadProjectFile(profile("cliente"), "proj-1");
    expect(result).toBe(false);
  });

  it("ingeniero asignado puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canUploadProjectFile(profile("ingeniero"), "proj-1")).toBe(true);
  });

  it("ingeniero no asignado no puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(await canUploadProjectFile(profile("ingeniero"), "proj-1")).toBe(false);
  });

  it("marketing asignado puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canUploadProjectFile(profile("marketing"), "proj-1")).toBe(true);
  });

  it("marketing no asignado no puede subir archivos", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(await canUploadProjectFile(profile("marketing"), "proj-1")).toBe(false);
  });
});

// ---- canDeleteProjectFile ----

describe("canDeleteProjectFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede eliminar cualquier archivo", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({ uploadedBy: "user-ingeniero", deletedAt: null } as never);
    expect(await canDeleteProjectFile(profile("super_admin"), "file-1")).toBe(true);
  });

  it("uploader puede eliminar su propio archivo", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({ uploadedBy: "user-ingeniero", deletedAt: null } as never);
    expect(await canDeleteProjectFile(profile("ingeniero"), "file-1")).toBe(true);
  });

  it("usuario no autor no puede eliminar archivo ajeno", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({ uploadedBy: "user-ingeniero", deletedAt: null } as never);
    expect(await canDeleteProjectFile(profile("marketing"), "file-1")).toBe(false);
  });

  it("archivo eliminado no puede volver a eliminarse", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue({ uploadedBy: "user-ingeniero", deletedAt: new Date() } as never);
    expect(await canDeleteProjectFile(profile("super_admin"), "file-1")).toBe(false);
  });

  it("archivo inexistente retorna false", async () => {
    vi.mocked(prisma.projectFile.findUnique).mockResolvedValue(null);
    expect(await canDeleteProjectFile(profile("ingeniero"), "missing")).toBe(false);
  });
});

// ---- canUploadUpdateFile ----

describe("canUploadUpdateFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede subir archivos de actualizacion", async () => {
    expect(await canUploadUpdateFile(profile("super_admin"), "proj-1")).toBe(true);
  });

  it("cliente no puede subir archivos de actualizacion", async () => {
    expect(await canUploadUpdateFile(profile("cliente"), "proj-1")).toBe(false);
  });

  it("staff asignado puede subir archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({ id: "a" } as never);
    expect(await canUploadUpdateFile(profile("ingeniero"), "proj-1")).toBe(true);
  });

  it("staff no asignado no puede subir archivos de actualizacion", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    expect(await canUploadUpdateFile(profile("marketing"), "proj-1")).toBe(false);
  });
});

// ---- canDeleteUpdateFile ----

describe("canDeleteUpdateFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super_admin puede eliminar cualquier archivo de actualizacion", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      uploadedBy: "user-marketing",
      deletedAt: null,
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    expect(await canDeleteUpdateFile(profile("super_admin"), "ufile-1")).toBe(true);
  });

  it("autor de la actualizacion puede eliminar archivo", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      uploadedBy: "user-marketing",
      deletedAt: null,
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    expect(await canDeleteUpdateFile(profile("ingeniero"), "ufile-1")).toBe(true);
  });

  it("uploader del archivo puede eliminarlo", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      uploadedBy: "user-marketing",
      deletedAt: null,
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    expect(await canDeleteUpdateFile(profile("marketing"), "ufile-1")).toBe(true);
  });

  it("usuario no autor no puede eliminar archivo de actualizacion ajeno", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      uploadedBy: "user-ingeniero",
      deletedAt: null,
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    expect(await canDeleteUpdateFile(profile("marketing"), "ufile-1")).toBe(false);
  });

  it("archivo asociado a actualizacion eliminada no es eliminable", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      uploadedBy: "user-ingeniero",
      deletedAt: null,
      update: { authorId: "user-ingeniero", deletedAt: new Date() },
    } as never);
    expect(await canDeleteUpdateFile(profile("super_admin"), "ufile-1")).toBe(false);
  });

  it("archivo con soft-delete propio no es eliminable", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue({
      id: "ufile-1",
      uploadedBy: "user-ingeniero",
      deletedAt: new Date(),
      update: { authorId: "user-ingeniero", deletedAt: null },
    } as never);
    expect(await canDeleteUpdateFile(profile("super_admin"), "ufile-1")).toBe(false);
  });

  it("archivo de actualizacion inexistente retorna false", async () => {
    vi.mocked(prisma.updateFile.findUnique).mockResolvedValue(null);
    expect(await canDeleteUpdateFile(profile("ingeniero"), "missing")).toBe(false);
  });
});

// ---- MIME validation ----

import {
  ALLOWED_PROJECT_FILE_TYPES,
  ALLOWED_UPDATE_FILE_TYPES,
  ALLOWED_VIDEO_TYPES,
  isValidMimeType,
  isValidExtension,
} from "@/lib/projects/storage";

describe("ALLOWED_PROJECT_FILE_TYPES", () => {
  it("permite image/jpeg", () => {
    expect(isValidMimeType("image/jpeg", ALLOWED_PROJECT_FILE_TYPES)).toBe(true);
  });
  it("permite image/png", () => {
    expect(isValidMimeType("image/png", ALLOWED_PROJECT_FILE_TYPES)).toBe(true);
  });
  it("permite image/webp", () => {
    expect(isValidMimeType("image/webp", ALLOWED_PROJECT_FILE_TYPES)).toBe(true);
  });
  it("permite application/pdf", () => {
    expect(isValidMimeType("application/pdf", ALLOWED_PROJECT_FILE_TYPES)).toBe(true);
  });
  it("rechaza video/mp4", () => {
    expect(isValidMimeType("video/mp4", ALLOWED_PROJECT_FILE_TYPES)).toBe(false);
  });
  it("rechaza video/webm", () => {
    expect(isValidMimeType("video/webm", ALLOWED_PROJECT_FILE_TYPES)).toBe(false);
  });
  it("rechaza video/quicktime", () => {
    expect(isValidMimeType("video/quicktime", ALLOWED_PROJECT_FILE_TYPES)).toBe(false);
  });
  it("rechaza text/html", () => {
    expect(isValidMimeType("text/html", ALLOWED_PROJECT_FILE_TYPES)).toBe(false);
  });
});

describe("ALLOWED_UPDATE_FILE_TYPES", () => {
  it("permite image/jpeg", () => {
    expect(isValidMimeType("image/jpeg", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("permite image/png", () => {
    expect(isValidMimeType("image/png", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("permite image/webp", () => {
    expect(isValidMimeType("image/webp", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("permite video/mp4", () => {
    expect(isValidMimeType("video/mp4", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("permite video/webm", () => {
    expect(isValidMimeType("video/webm", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("permite video/quicktime", () => {
    expect(isValidMimeType("video/quicktime", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("permite application/pdf", () => {
    expect(isValidMimeType("application/pdf", ALLOWED_UPDATE_FILE_TYPES)).toBe(true);
  });
  it("rechaza text/html", () => {
    expect(isValidMimeType("text/html", ALLOWED_UPDATE_FILE_TYPES)).toBe(false);
  });
  it("rechaza application/javascript", () => {
    expect(isValidMimeType("application/javascript", ALLOWED_UPDATE_FILE_TYPES)).toBe(false);
  });
});

describe("ALLOWED_VIDEO_TYPES", () => {
  it("incluye video/mp4", () => {
    expect((ALLOWED_VIDEO_TYPES as readonly string[]).includes("video/mp4")).toBe(true);
  });
  it("incluye video/webm", () => {
    expect((ALLOWED_VIDEO_TYPES as readonly string[]).includes("video/webm")).toBe(true);
  });
  it("incluye video/quicktime", () => {
    expect((ALLOWED_VIDEO_TYPES as readonly string[]).includes("video/quicktime")).toBe(true);
  });
});

describe("isValidExtension", () => {
  it("foto.jpg con image/jpeg", () => {
    expect(isValidExtension("foto.jpg", "image/jpeg")).toBe(true);
  });
  it("foto.jpeg con image/jpeg", () => {
    expect(isValidExtension("foto.jpeg", "image/jpeg")).toBe(true);
  });
  it("imagen.png con image/png", () => {
    expect(isValidExtension("imagen.png", "image/png")).toBe(true);
  });
  it("imagen.webp con image/webp", () => {
    expect(isValidExtension("imagen.webp", "image/webp")).toBe(true);
  });
  it("contrato.pdf con application/pdf", () => {
    expect(isValidExtension("contrato.pdf", "application/pdf")).toBe(true);
  });
  it("avance.mp4 con video/mp4", () => {
    expect(isValidExtension("avance.mp4", "video/mp4")).toBe(true);
  });
  it("avance.webm con video/webm", () => {
    expect(isValidExtension("avance.webm", "video/webm")).toBe(true);
  });
  it("avance.mov con video/quicktime", () => {
    expect(isValidExtension("avance.mov", "video/quicktime")).toBe(true);
  });
  it("foto.pdf con image/jpeg → false", () => {
    expect(isValidExtension("foto.pdf", "image/jpeg")).toBe(false);
  });
  it("contrato.exe con application/pdf → false", () => {
    expect(isValidExtension("contrato.exe", "application/pdf")).toBe(false);
  });
  it("video.pdf con video/mp4 → false", () => {
    expect(isValidExtension("video.pdf", "video/mp4")).toBe(false);
  });
  it("sin extension retorna false", () => {
    expect(isValidExtension("archivo", "image/jpeg")).toBe(false);
  });
});
