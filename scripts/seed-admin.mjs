import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

loadEnvFile(".env");
loadEnvFile(".env.local");

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(
    `Faltan variables para seed: ${missingEnv.join(", ")}. Completa .env.local antes de ejecutar npm run seed:admin.`,
  );
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error("ADMIN_EMAIL y ADMIN_PASSWORD no pueden estar vacíos.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

try {
  const existingUser = await findUserByEmail(adminEmail);

  if (existingUser) {
    await ensureAdminRole(existingUser.id, existingUser.app_metadata);
    console.log("Usuario administrador existente verificado y actualizado.");
    process.exit(0);
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    app_metadata: {
      role: "admin",
    },
  });

  if (createError) {
    throw new Error(`No se pudo crear el administrador: ${createError.message}`);
  }

  console.log("Usuario administrador creado correctamente.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el seed de administrador.");
  process.exit(1);
}

async function findUserByEmail(email) {
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`No se pudo listar usuarios: ${error.message}`);
    }

    const foundUser = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );

    if (foundUser) {
      return foundUser;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureAdminRole(userId, currentAppMetadata) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
    app_metadata: {
      ...currentAppMetadata,
      role: "admin",
    },
  });

  if (error) {
    throw new Error(`No se pudo actualizar el administrador: ${error.message}`);
  }
}

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const rawValue = trimmedLine.slice(equalsIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = stripQuotes(rawValue);
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
