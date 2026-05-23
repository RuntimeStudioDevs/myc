// ============================================================
// MYC — Seed de desarrollo local
// ============================================================
// Crea usuarios de prueba para todos los roles usando
// Supabase Admin API + Prisma.
//
// Contrasena comun: Test123456!
//
// IDEMPOTENTE: puede ejecutarse multiples veces sin duplicar.
//
// Requiere .env con:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   DATABASE_URL
//
// Ejecutar: npx tsx prisma/seed.ts
// ============================================================

import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

// Cargar .env.local (variables de Supabase Auth)
config({ path: resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const SEED_PASSWORD = "Test123456!";

interface SeedUser {
  email: string;
  name: string;
  role: "super_admin" | "ingeniero" | "marketing" | "cliente";
  needsClient?: boolean;
}

const SEED_USERS: SeedUser[] = [
  {
    email: "superadmin@test.local",
    name: "Super Admin Test",
    role: "super_admin",
  },
  {
    email: "ingeniero@test.local",
    name: "Ingeniero Test",
    role: "ingeniero",
  },
  {
    email: "marketing@test.local",
    name: "Marketing Test",
    role: "marketing",
  },
  {
    email: "cliente@test.local",
    name: "Cliente Test",
    role: "cliente",
    needsClient: true,
  },
];

async function seed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "ERROR: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos en .env",
    );
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl! }),
  });

  console.log("=== MYC Seed ===\n");

  let superAdminId: string | null = null;

  for (const seedUser of SEED_USERS) {
    console.log(`Procesando: ${seedUser.email} (${seedUser.role})`);

    // 1. Verificar si el usuario ya existe en auth.users
    const { data: existingUsers, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error(`  Error listando usuarios: ${listError.message}`);
      continue;
    }

    const existingAuthUser = existingUsers.users.find(
      (u) => u.email === seedUser.email,
    );

    let userId: string;

    if (existingAuthUser) {
      // Usuario ya existe — actualizar metadata
      userId = existingAuthUser.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: seedUser.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { name: seedUser.name },
      });
      console.log(`  Usuario existente actualizado (id: ${userId})`);
    } else {
      // Crear nuevo usuario
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: seedUser.email,
          password: SEED_PASSWORD,
          email_confirm: true,
          user_metadata: { name: seedUser.name },
        });

      if (createError || !newUser.user) {
        console.error(
          `  Error creando usuario: ${createError?.message ?? "unknown"}`,
        );
        continue;
      }

      userId = newUser.user.id;
      console.log(`  Usuario creado (id: ${userId})`);
    }

    // 2. Actualizar perfil en public.usuarios (rol correcto)
    const profile = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      console.log(
        "  Perfil no encontrado aun (trigger pendiente). Reintentando...",
      );
      // El trigger puede tardar. Reintentar una vez.
      await new Promise((r) => setTimeout(r, 1000));
      const retryProfile = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!retryProfile) {
        console.error(
          "  ERROR: Perfil no creado por el trigger. Saltando.",
        );
        continue;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: seedUser.name,
        email: seedUser.email,
        role: seedUser.role,
        active: true,
      },
    });
    console.log(`  Perfil actualizado: rol=${seedUser.role}, activo=true`);

    // 3. Si es super_admin, guardar ID para crear clientes
    if (seedUser.role === "super_admin") {
      superAdminId = userId;
    }

    // 4. Si es cliente, crear registro en clientes
    if (seedUser.needsClient && superAdminId) {
      const existingClient = await prisma.client.findFirst({
        where: { userId },
      });

      if (existingClient) {
        await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            displayName: seedUser.name,
            clientType: "persona",
            phone: "555-0000",
            document: "TEST-0001",
          },
        });
        console.log(`  Cliente actualizado (id: ${existingClient.id})`);
      } else {
        const newClient = await prisma.client.create({
          data: {
            clientType: "persona",
            displayName: seedUser.name,
            phone: "555-0000",
            document: "TEST-0001",
            userId,
            createdBy: superAdminId,
          },
        });
        console.log(`  Cliente creado (id: ${newClient.id})`);
      }
    }

    console.log("");
  }

  console.log("=== Seed completado ===");
  console.log(`Contrasena comun: ${SEED_PASSWORD}`);
  console.log("Usuarios:");
  for (const u of SEED_USERS) {
    console.log(`  ${u.email} — ${u.role}`);
  }

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed falló:", err);
  process.exit(1);
});
