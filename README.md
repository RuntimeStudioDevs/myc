# MYC

MYC es una plataforma interna para una sola constructora. El objetivo del MVP es administrar clientes y obras, asignar responsables, publicar avances, centralizar comentarios y permitir que el cliente consulte sus obras, historial, progreso y conversación.

La fuente funcional del proyecto es `LORE.md`. Las reglas para agentes y documentación viven en `AGENTS.md` y `.agents/skills/`.

## Stack Actual Instalado

- Next.js `16.2.6`
- React `19.2.4`
- TypeScript strict
- Tailwind CSS `^4`
- ESLint `^9`
- React Compiler habilitado en `next.config.ts`
- Supabase JS y Supabase SSR
- Prisma y Prisma Client

## Decisión Técnica Definida

MYC usará PostgreSQL como base de datos principal, Supabase como plataforma backend gestionada, Prisma como ORM/capa de acceso a datos de la aplicación y Supabase Auth apoyado en PostgreSQL para autenticación.

La primera integración funcional incluye:
- Google OAuth mediante Supabase Auth.
- Login y registro con email/password mediante Supabase Auth.
- Sesión SSR con cookies via `@supabase/ssr`.
- Ruta protegida `/protected` con validación servidor (`getClaims()` + `getUser()`).
- Seed de administrador inicial con `npm run seed:admin`.

Los modelos de negocio, roles de MYC, perfiles, RLS, Storage y autorización por obra asignada quedan fuera de este alcance inicial.

## Configuración Local

### 1. Crear Proyecto en Supabase

1. Crea un proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Anota la **Project URL** y las **API Keys** (anon/public y service_role).

### 2. Configurar Variables de Entorno

Copia `.env.example` como `.env.local` y completa los valores reales:

```bash
cp .env.example .env.local   # Linux/macOS
copy .env.example .env.local # Windows
```

Edita `.env.local` con los valores de tu proyecto Supabase:

| Variable | Dónde obtenerla | Sensibilidad |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable key o anon key | Pública |
| `DATABASE_URL` | Project Settings → Database → Connection string (pooler, puerto 6543) | Secreta |
| `DIRECT_DATABASE_URL` | Project Settings → Database → Direct connection (puerto 5432) | Secreta |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → service_role o secret key | Secreta (nunca en frontend) |
| `ADMIN_EMAIL` | Defínelo tú para el seed de administrador | Secreta |
| `ADMIN_PASSWORD` | Defínela tú (mínimo 6 caracteres) | Secreta |

### 3. Configurar Google OAuth (Opcional pero Recomendado)

1. Ve a **Supabase Dashboard → Authentication → Providers** y habilita Google.
2. Copia el **Callback URL** que muestra Supabase (algo como `https://<project>.supabase.co/auth/v1/callback`).
3. Ve a [Google Cloud Console](https://console.cloud.google.com), crea un proyecto o usa uno existente.
4. Ve a **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
5. Tipo: **Web application**.
6. Agrega `http://localhost:3000` como **Authorized JavaScript origins**.
7. Agrega el callback URL de Supabase en **Authorized redirect URIs**.
8. Copia el **Client ID** y **Client Secret** generados y pégalos en Supabase en la configuración del provider Google.
9. En Supabase Auth, agrega `http://localhost:3000` en **Site URL** (Authentication → URL Configuration).

### 4. Ejecutar el Seed de Administrador

```bash
npm install
npm run seed:admin
```

Esto crea un usuario administrador en Supabase Auth usando `SUPABASE_SERVICE_ROLE_KEY`. El usuario tendrá `app_metadata.role = "admin"` y en `/protected` se mostrará como **Administrador**.

Si el usuario ya existe, el script actualiza su rol a admin (idempotente).

### 5. Probar Localmente

```bash
npm run dev
```

Abre `http://localhost:3000`.

### Testing de Funcionalidades

| Funcionalidad | Cómo probar |
|---|---|
| **Login Google** | Haz clic en "Iniciar sesión o registrarse con Google". Debe redirigir a Google y luego a `/protected`. |
| **Registro email/password** | Completa email + contraseña en "Crear cuenta con email" y haz clic en "Registrarse con email". |
| **Login email/password** | Completa email + contraseña en "Iniciar sesión con email" y haz clic. |
| **Admin seed** | Inicia sesión con `ADMIN_EMAIL`/`ADMIN_PASSWORD`. En `/protected` debe mostrar "Administrador". |
| **Ruta protegida** | Sin sesión, navega a `/protected`. Debe redirigir a `/`. |
| **Logout** | Haz clic en "Cerrar sesión". Debe redirigir a `/` y mostrar el formulario de login. |

## Comandos Útiles

```bash
npm install              # Instala dependencias
npm run dev              # Inicia servidor de desarrollo
npm run lint              # Ejecuta ESLint
npm run build             # Compila para producción (verifica TypeScript + Next.js)
npx prisma validate       # Valida el esquema Prisma
npm run seed:admin        # Crea/actualiza el usuario administrador en Supabase Auth
```

No uses service role keys en el cliente ni hardcodees URLs, claves o cadenas de conexión.

## Desarrollo

```bash
npm run dev
```

Antes de entregar cambios de código significativos:

```bash
npm run lint
npm run build
```
