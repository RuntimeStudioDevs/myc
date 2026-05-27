import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserProfile: vi.fn(),
}));

vi.mock("@/lib/auth/guards", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    requireAnyRole: vi.fn(),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { createUser: vi.fn() } },
  })),
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
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      client: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    } as never,
  };
});

import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth/guards";
import { listClients } from "@/lib/clients/queries";
import { createClientAction, updateClientAction } from "@/lib/clients/actions";

// ---- listClients ----

describe("listClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("por defecto no filtra por usuario activo", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([] as never);
    await listClients();
    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      include: {
        user: {
          select: { id: true, email: true, name: true, active: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("con onlyActiveUsers true agrega filtro user.active = true", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([] as never);
    await listClients(true);
    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, user: { active: true } },
      include: {
        user: {
          select: { id: true, email: true, name: true, active: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("con onlyActiveUsers false no agrega filtro de usuario", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([] as never);
    await listClients(false);
    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      include: {
        user: {
          select: { id: true, email: true, name: true, active: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

// ---- createClientAction: validacion phone/document ----

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

describe("createClientAction — validacion phone y document", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const formBase = () => {
    const fd = new FormData();
    fd.set("displayName", "Test Client");
    fd.set("clientType", "persona");
    fd.set("email", "test@test.local");
    fd.set("name", "Test User");
    fd.set("password", "Test123456!");
    fd.set("phone", "");
    fd.set("document", "");
    return fd;
  };

  it("rechaza phone con mas de 10 caracteres", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    const fd = formBase();
    fd.set("phone", "12345678901");

    await expectRedirect(
      createClientAction(fd),
      "/dashboard/clients?error=phone-too-long",
    );
  });

  it("rechaza document con mas de 10 caracteres", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    const fd = formBase();
    fd.set("document", "12345678901");

    await expectRedirect(
      createClientAction(fd),
      "/dashboard/clients?error=document-too-long",
    );
  });

  it("acepta phone de exactamente 10 caracteres (pasa validacion de longitud)", async () => {
    // phone de 10 chars pasa la validacion. La action seguira con Supabase Auth.
    // Verificamos que NO redirige por phone-too-long.
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    const fd = formBase();
    fd.set("phone", "1234567890");

    try {
      await createClientAction(fd);
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain("phone-too-long");
    }
  });
});

// ---- updateClientAction: validacion phone/document ----

describe("updateClientAction — validacion phone y document", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const formBase = () => {
    const fd = new FormData();
    fd.set("clientId", "client-1");
    fd.set("displayName", "Updated Client");
    fd.set("clientType", "persona");
    fd.set("phone", "");
    fd.set("document", "");
    return fd;
  };

  it("rechaza phone con mas de 10 caracteres", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    const fd = formBase();
    fd.set("phone", "12345678901");

    await expectRedirect(
      updateClientAction(fd),
      "/dashboard/clients?error=phone-too-long",
    );
  });

  it("rechaza document con mas de 10 caracteres", async () => {
    vi.mocked(requireAnyRole).mockResolvedValue({
      id: "user-ingeniero",
      role: "ingeniero",
      active: true,
    } as never);

    const fd = formBase();
    fd.set("document", "12345678901");

    await expectRedirect(
      updateClientAction(fd),
      "/dashboard/clients?error=document-too-long",
    );
  });
});
