import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaUser } from "@/lib/auth/types";

vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        updateUser: vi.fn(),
      },
    })),
  };
});

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      emailChangeRequest: {
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    },
  } as never;
});

vi.mock("@/lib/supabase/admin", () => {
  return {
    createAdminClient: vi.fn(() => ({
      auth: {
        admin: {
          updateUserById: vi.fn(),
        },
      },
    })),
  };
});

vi.mock("next/navigation", () => {
  return {
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
});

vi.mock("@/lib/profile/email-sender", () => {
  return {
    sendVerificationCode: vi.fn(),
  };
});
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/guards";

function profile(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@test.local",
    role: "ingeniero",
    active: true,
    deletedAt: null,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2026-05-01"),
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
    ...overrides,
  } as PrismaUser;
}

// ---- requireActiveProfile access ----

describe("acceso a /dashboard/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usuario activo puede acceder", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      profile() as never,
    );
    const supabaseMock = vi.mocked(createClient);
    supabaseMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.local" } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        updateUser: vi.fn(),
      },
    } as never);

    const result = await requireActiveProfile();
    expect(result.id).toBe("user-1");
    expect(result.active).toBe(true);
  });

  it("usuario inactivo es redirigido", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      profile({ active: false }) as never,
    );
    const supabaseMock = vi.mocked(createClient);
    supabaseMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.local" } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        updateUser: vi.fn(),
      },
    } as never);

    await requireActiveProfile();
    expect(redirect).toHaveBeenCalledWith("/login?error=inactive");
  });
});

// ---- updateOwnPasswordAction ----

import {
  updateOwnPasswordAction,
} from "@/lib/profile/actions";

describe("updateOwnPasswordAction", () => {
  beforeEach(() => vi.clearAllMocks());

  function form(...entries: [string, string][]) {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  }

  it("rechaza campos vacios", async () => {
    await updateOwnPasswordAction(form(["password", ""], ["confirmPassword", ""]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("error=");
  });

  it("rechaza menos de 8 caracteres", async () => {
    await updateOwnPasswordAction(form(["password", "1234567"], ["confirmPassword", "1234567"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("error=");
    expect(call).toContain("8");
  });

  it("rechaza confirmacion distinta", async () => {
    await updateOwnPasswordAction(form(["password", "12345678"], ["confirmPassword", "87654321"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("error=");
  });

  it("llama supabase.auth.updateUser con password valida", async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({
      auth: { updateUser: mockUpdateUser },
    } as never);

    await updateOwnPasswordAction(form(["password", "12345678"], ["confirmPassword", "12345678"]));
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "12345678" });
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("password-updated=true");
  });

  it("maneja error de Supabase", async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({
      error: { message: "Password too weak" },
    });
    vi.mocked(createClient).mockReturnValue({
      auth: { updateUser: mockUpdateUser },
    } as never);

    await updateOwnPasswordAction(form(["password", "12345678"], ["confirmPassword", "12345678"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("error=");
    expect(call).toContain("Password%20too%20weak");
  });
});

// ---- forgotPasswordAction ----

import {
  forgotPasswordAction,
  resetPasswordAction,
} from "@/lib/auth/actions";

vi.mock("next/headers", () => {
  return {
    headers: vi.fn(() => new Map([["origin", "http://localhost:3000"]])),
    cookies: vi.fn(),
  };
});

describe("forgotPasswordAction", () => {
  beforeEach(() => vi.clearAllMocks());

  function form(...entries: [string, string][]) {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  }

  it("rechaza email vacio", async () => {
    await forgotPasswordAction(form(["email", ""]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("forgot-password?error=");
  });

  it("rechaza email invalido", async () => {
    await forgotPasswordAction(form(["email", "notanemail"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("forgot-password?error=");
  });

  it("llama resetPasswordForEmail con redirectTo", async () => {
    const mockResetPassword = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        updateUser: vi.fn(),
        resetPasswordForEmail: mockResetPassword,
      },
    } as never);

    await forgotPasswordAction(form(["email", "test@test.local"]));
    expect(mockResetPassword).toHaveBeenCalledWith("test@test.local", {
      redirectTo: "http://localhost:3000/reset-password",
    });
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("forgot-password?email-sent=true");
  });

  it("maneja error de Supabase", async () => {
    const mockResetPassword = vi.fn().mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        updateUser: vi.fn(),
        resetPasswordForEmail: mockResetPassword,
      },
    } as never);

    await forgotPasswordAction(form(["email", "test@test.local"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("forgot-password?error=");
  });
});

// ---- resetPasswordAction ----

describe("resetPasswordAction", () => {
  beforeEach(() => vi.clearAllMocks());

  function form(...entries: [string, string][]) {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  }

  it("rechaza campos vacios", async () => {
    await resetPasswordAction(form(["password", ""], ["confirmPassword", ""]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("reset-password?error=");
  });

  it("rechaza menos de 8 caracteres", async () => {
    await resetPasswordAction(form(["password", "1234567"], ["confirmPassword", "1234567"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("reset-password?error=");
  });

  it("rechaza confirmacion distinta", async () => {
    await resetPasswordAction(form(["password", "12345678"], ["confirmPassword", "87654321"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("reset-password?error=");
  });

  it("llama updateUser con password valida", async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        updateUser: mockUpdateUser,
      },
    } as never);

    await resetPasswordAction(form(["password", "12345678"], ["confirmPassword", "12345678"]));
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "12345678" });
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("login?password-reset=true");
  });

  it("maneja error de Supabase", async () => {
    const mockUpdateUser = vi.fn().mockResolvedValue({
      error: { message: "Password too weak" },
    });
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        updateUser: mockUpdateUser,
      },
    } as never);

    await resetPasswordAction(form(["password", "12345678"], ["confirmPassword", "12345678"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("reset-password?error=");
  });
});

// ---- requestEmailChangeAction ----

import {
  requestEmailChangeAction,
  verifyEmailChangeAction,
} from "@/lib/profile/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationCode } from "@/lib/profile/email-sender";
import { hashVerificationCode } from "@/lib/profile/code-utils";

describe("requestEmailChangeAction", () => {
  beforeEach(() => vi.clearAllMocks());

  function form(...entries: [string, string][]) {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  }

  function mockAuthUser(overrides: Partial<PrismaUser> = {}) {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      profile(overrides) as never,
    );
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.local" } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        updateUser: vi.fn(),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never);
  }

  it("rechaza email vacio", async () => {
    mockAuthUser();
    await requestEmailChangeAction(form(["email", ""]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("profile?error=");
  });

  it("rechaza formato invalido", async () => {
    mockAuthUser();
    await requestEmailChangeAction(form(["email", "notanemail"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("profile?error=");
  });

  it("rechaza email igual al actual", async () => {
    mockAuthUser();
    await requestEmailChangeAction(form(["email", "test@test.local"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("profile?error=");
  });

  it("rechaza email ya usado por otra cuenta", async () => {
    mockAuthUser();
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "user-2" } as never);
    await requestEmailChangeAction(form(["email", "taken@test.local"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("profile?error=");
  });

  it("crea solicitud con codigo hasheado y envia codigo", async () => {
    mockAuthUser();
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.emailChangeRequest.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.emailChangeRequest.create).mockResolvedValue({} as never);
    vi.mocked(sendVerificationCode).mockReturnValue();

    await requestEmailChangeAction(form(
      ["email", "new@test.local"],
      ["currentPassword", "mypassword123"],
    ));

    expect(prisma.emailChangeRequest.updateMany).toHaveBeenCalled();
    expect(prisma.emailChangeRequest.create).toHaveBeenCalled();
    const createCall = vi.mocked(prisma.emailChangeRequest.create).mock.calls[0][0] as {
      data: { codeHash: string; newEmail: string };
    };
    expect(createCall.data.newEmail).toBe("new@test.local");
    expect(createCall.data.codeHash).toBeTruthy();
    expect(createCall.data.codeHash).not.toBe("123456");
    expect(sendVerificationCode).toHaveBeenCalled();

    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?sent=true");
  });
});

// ---- verifyEmailChangeAction ----

describe("verifyEmailChangeAction", () => {
  beforeEach(() => vi.clearAllMocks());

  function form(...entries: [string, string][]) {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  }

  function mockAuthUser() {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      profile() as never,
    );
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@test.local" } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        updateUser: vi.fn(),
      },
    } as never);
  }

  it("rechaza codigo vacio", async () => {
    mockAuthUser();
    await verifyEmailChangeAction(form(["code", ""]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?error=");
  });

  it("rechaza codigo no numerico", async () => {
    mockAuthUser();
    await verifyEmailChangeAction(form(["code", "abcdef"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?error=");
  });

  it("rechaza si no hay solicitud activa", async () => {
    mockAuthUser();
    vi.mocked(prisma.emailChangeRequest.findFirst).mockResolvedValue(null);
    await verifyEmailChangeAction(form(["code", "123456"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?error=");
  });

  it("rechaza mas de 5 intentos", async () => {
    mockAuthUser();
    vi.mocked(prisma.emailChangeRequest.findFirst).mockResolvedValue({
      id: "req-1",
      attempts: 5,
      codeHash: "hash",
      newEmail: "new@test.local",
    } as never);
    await verifyEmailChangeAction(form(["code", "123456"]));
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?error=");
  });

  it("codigo valido llama Admin API y actualiza Prisma", async () => {
    mockAuthUser();
    vi.mocked(prisma.emailChangeRequest.findFirst).mockResolvedValue({
      id: "req-1",
      attempts: 0,
      codeHash: hashVerificationCode("123456"),
      newEmail: "new@test.local",
    } as never);

    const mockUpdateById = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { updateUserById: mockUpdateById } },
    } as never);

    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.emailChangeRequest.update).mockResolvedValue({} as never);

    await verifyEmailChangeAction(form(["code", "123456"]));

    expect(mockUpdateById).toHaveBeenCalledWith("user-1", {
      email: "new@test.local",
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { email: "new@test.local" },
    });
    expect(prisma.emailChangeRequest.update).toHaveBeenCalled();

    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("profile?email-updated=true");
  });

  it("codigo incorrecto incrementa intentos", async () => {
    mockAuthUser();
    vi.mocked(prisma.emailChangeRequest.findFirst).mockResolvedValue({
      id: "req-1",
      attempts: 0,
      codeHash: "somehash",
      newEmail: "new@test.local",
    } as never);
    vi.mocked(prisma.emailChangeRequest.update).mockResolvedValue({} as never);

    await verifyEmailChangeAction(form(["code", "999999"]));

    expect(prisma.emailChangeRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { attempts: 1 },
    });
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?error=");
  });

  it("error de Admin API no actualiza Prisma", async () => {
    mockAuthUser();
    vi.mocked(prisma.emailChangeRequest.findFirst).mockResolvedValue({
      id: "req-1",
      attempts: 0,
      codeHash: hashVerificationCode("123456"),
      newEmail: "new@test.local",
    } as never);

    const mockUpdateById = vi.fn().mockResolvedValue({
      error: { message: "Admin API error" },
    });
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { updateUserById: mockUpdateById } },
    } as never);

    await verifyEmailChangeAction(form(["code", "123456"]));

    expect(prisma.user.update).not.toHaveBeenCalled();
    const call = vi.mocked(redirect).mock.calls[0][0] as string;
    expect(call).toContain("verify-email?error=");
  });
});
