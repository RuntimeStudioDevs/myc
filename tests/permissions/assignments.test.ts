import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      projectAssignment: {
        findFirst: vi.fn(),
      },
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import { isPrimaryEngineer } from "@/lib/projects/assignments/queries";

// ---- isPrimaryEngineer ----

describe("isPrimaryEngineer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna true si el usuario es ingeniero principal activo de la obra", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue({
      id: "assign-1",
    } as never);
    const result = await isPrimaryEngineer("proj-1", "eng-1");
    expect(result).toBe(true);
    expect(prisma.projectAssignment.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "proj-1",
        userId: "eng-1",
        role: "ingeniero",
        isPrincipal: true,
        unassignedAt: null,
      },
    });
  });

  it("retorna false si el usuario no es ingeniero principal", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await isPrimaryEngineer("proj-1", "eng-2");
    expect(result).toBe(false);
  });

  it("retorna false si no existe asignacion alguna", async () => {
    vi.mocked(prisma.projectAssignment.findFirst).mockResolvedValue(null);
    const result = await isPrimaryEngineer("proj-1", "nobody");
    expect(result).toBe(false);
  });
});
