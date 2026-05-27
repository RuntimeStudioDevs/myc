# MYC — Plataforma de Seguimiento de Obras

Plataforma interna para constructoras que permite administrar clientes, obras, asignar ingenieros y personal de marketing, publicar avances con fotos y videos, gestionar archivos y centralizar la comunicacion de seguimiento en un solo lugar.

## Stack tecnico

| Tecnologia | Version |
|---|---|
| Next.js (App Router) | 16 |
| React | 19 |
| TypeScript | 5 (strict) |
| Prisma | 7 |
| PostgreSQL | — |
| Supabase Auth | — |
| Supabase Storage | — |
| Tailwind CSS | 4 |
| Vitest | 4 |
| ESLint | 9 |

## Requisitos previos

- Node.js 18+
- PostgreSQL (local o remoto)
- Proyecto Supabase configurado (Auth, Database, Storage)
- Cuenta de Supabase con permisos de service_role

## Instalacion local

```bash
git clone <repositorio>
cd myc
npm install
```

Configurar variables de entorno:

```bash
cp .env.example .env.local
```

Luego editar `.env.local` con los valores reales del proyecto Supabase.

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Descripcion | Requerida | Archivo |
|---|---|---|---|
| `DATABASE_URL` | URL de conexion a PostgreSQL (pooler) | Si | `.env` |
| `DIRECT_URL` | URL directa para migraciones de Prisma | Si | `.env` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publica del proyecto Supabase | Si | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anonima de Supabase (segura en cliente) | Si | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase (NUNCA exponer en cliente) | Si | `.env.local` |

> **Nota:** `DATABASE_URL` y `DIRECT_URL` usan el Session Pooler de Supabase (Supavisor, puerto 5432) para compatibilidad con redes IPv4. `NEXT_PUBLIC_SUPABASE_ANON_KEY` es segura en el navegador; `SUPABASE_SERVICE_ROLE_KEY` solo se usa en server actions y nunca se expone al cliente.

## Scripts disponibles

| Comando | Descripcion |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en [localhost:3000](http://localhost:3000) |
| `npm run build` | Compila el proyecto para produccion |
| `npm run start` | Inicia el servidor en modo produccion |
| `npm run lint` | Ejecuta ESLint en todo el proyecto |
| `npx vitest run` | Ejecuta la suite de pruebas (74 tests en 6 archivos) |
| `npx prisma generate` | Genera el cliente de Prisma en `src/generated/prisma` |
| `npx prisma migrate dev` | Aplica migraciones pendientes en desarrollo |
| `npm run db:seed` | Ejecuta el script de seed de la base de datos |

## Estructura del proyecto

```
src/
  app/                          # Rutas y paginas (App Router)
    (auth)/                     # Grupo de rutas de autenticacion
      login/page.tsx
      register/page.tsx
    dashboard/                  # Panel principal protegido
      page.tsx                  # Redirect segun rol
      loading.tsx               # Estado de carga generico
      error.tsx                 # Manejo de errores
      admin/users/page.tsx      # Administracion de usuarios (super_admin)
      client/page.tsx           # Dashboard del cliente
      clients/page.tsx          # Lista de clientes
      engineer/page.tsx         # Dashboard del ingeniero
      marketing/page.tsx        # Dashboard de marketing
      projects/page.tsx         # Lista de obras
      projects/[projectId]/page.tsx  # Detalle de obra
    not-found.tsx               # Pagina 404 personalizada
    layout.tsx                  # Layout raiz
    page.tsx                    # Home page
  components/                   # Componentes cliente compartidos
    comments/                   # InlineCommentEditor
    files/                      # FilePreview
    realtime/                   # ProjectRealtimeListener
    updates/                    # InlineUpdateEditor
  lib/                          # Logica de negocio (server-only)
    auth/                       # Sesion, guards, acciones de auth
    admin/users/                # CRUD de usuarios internos
    clients/                    # Queries y acciones de clientes
    projects/                   # Queries, acciones, permisos
      assignments/              # Asignaciones a obras
      comments/                 # Comentarios generales de obra
      files/                    # Archivos generales de obra
      updates/                  # Actualizaciones de obra
        comments/               # Comentarios de actualizacion
        files/                  # Archivos de actualizacion
    supabase/                   # Clientes de Supabase (server, browser, admin)
  generated/prisma/             # Cliente de Prisma generado
  proxy.ts                      # Middleware de sesion (Next.js 16)
prisma/
  schema.prisma                 # Modelo de datos
  migrations/                   # Migraciones
  seed.ts                       # Datos iniciales
  sql/                          # Scripts SQL auxiliares (RLS, FK, realtime)
tests/
  permissions/                  # Tests de permisos (74 tests)
  __mocks__/                    # Mocks para entorno de prueba
```

## Rutas principales

| Ruta | Proposito | Roles |
|---|---|---|
| `/` | Pagina de inicio | Publico |
| `/login` | Inicio de sesion | No autenticados |
| `/register` | Registro de cuenta | No autenticados |
| `/dashboard` | Redirige segun rol | Autenticados |
| `/dashboard/admin/users` | Gestion de usuarios internos | `super_admin` |
| `/dashboard/client` | Mis obras y seguimiento | `cliente` |
| `/dashboard/clients` | Lista de clientes | `super_admin`, `ingeniero`, `marketing` |
| `/dashboard/engineer` | Panel de ingenieria | `super_admin`, `ingeniero` |
| `/dashboard/marketing` | Panel de marketing | `super_admin`, `marketing` |
| `/dashboard/projects` | Lista de obras | `super_admin`, `ingeniero`, `marketing` |
| `/dashboard/projects/[projectId]` | Detalle de obra | Asignados + `super_admin` |

## Roles y permisos

| Rol | Ve | Crea | Edita | Restricciones |
|---|---|---|---|---|
| `super_admin` | Todo | Todo | Todo | Control administrativo total |
| `ingeniero` | Clientes, obras asignadas, actualizaciones | Clientes, obras, actualizaciones, comentarios, archivos | Solo su propio contenido | Requiere asignacion activa a la obra |
| `marketing` | Clientes activos, obras asignadas | Actualizaciones, comentarios, archivos de actualizacion | Solo su propio contenido | No crea/edita/elimina clientes ni obras. Requiere asignacion activa. |
| `cliente` | Sus obras, actualizaciones, archivos | Comentarios | Solo sus propios comentarios | Solo ve sus propias obras. No administra obras ni clientes. |

## Flujo de autenticacion

1. **Supabase Auth** gestiona el registro, inicio de sesion y sesiones.
2. Un **trigger de base de datos** sincroniza `auth.users` con `public.usuarios` (perfil de dominio con rol).
3. **`src/proxy.ts`** (middleware de Next.js 16) refresca la sesion en cada request y redirige a `/login` si no hay sesion al acceder a `/dashboard`.
4. Las **paginas** usan guards server-side (`requireAuth`, `requireAnyRole`, `requireSuperAdmin`) que verifican perfil activo y rol.
5. Las **server actions** vuelven a validar permisos antes de cualquier escritura. Los permisos se validan tanto en UI (se ocultan botones) como en backend (se bloquean acciones no autorizadas).

## Archivos y almacenamiento

- **Supabase Storage** (bucket `myc-project-files`) almacena todos los archivos.
- Los archivos se organizan en rutas: `projects/<id>/files/` y `projects/<id>/updates/<id>/`.
- **Signed URLs** (5 min de validez) se generan via `generateSignedUrl()` para descarga segura.
- `generateSignedUrl` usa `React.cache()` para deduplicar llamadas por filePath dentro de un mismo request.
- Formatos permitidos: JPEG, PNG, WebP (imagenes), MP4 (video), PDF (documentos).
- Tamanos maximos: 10 MB para imagenes/documentos, 50 MB para videos.

## Pruebas

El proyecto usa **Vitest** con 74 tests en 6 archivos, enfocados en permisos:

| Archivo | Funciones testeadas |
|---|---|
| `tests/permissions/comments.test.ts` | `canCreateProjectComment`, `canEditProjectComment`, `canCreateUpdateComment`, `canEditUpdateComment` |
| `tests/permissions/files.test.ts` | `canUploadProjectFile`, `canDeleteProjectFile`, `canUploadUpdateFile`, `canDeleteUpdateFile` |
| `tests/permissions/projects.test.ts` | `hasActiveProjectAssignment`, `canReadProject`, `canWriteProject` |
| `tests/permissions/updates.test.ts` | `canCreateProjectUpdate`, `canEditProjectUpdate`, `canDeleteProjectUpdate` |
| `tests/permissions/assignments.test.ts` | `isPrimaryEngineer` |
| `tests/permissions/clients.test.ts` | `listClients` (filtro `onlyActiveUsers`) |

```bash
npx vitest run
```

## Validacion del proyecto

Antes de hacer merge, ejecutar:

```bash
npx eslint --cache .
npx vitest run
npx next build
```

Los tres deben pasar sin errores.

## Decisiones tecnicas importantes

- **Next.js 16 usa `proxy.ts`** como middleware en lugar de `middleware.ts`. El archivo `src/proxy.ts` es el nombre correcto.
- **Prisma Client** se genera en `src/generated/prisma/` (configurado en `schema.prisma` con `output = "../src/generated/prisma"`).
- **Marketing ve solo clientes activos** en modo lectura. La query `listClients(true)` filtra por `user.active === true`. Las acciones de escritura usan `requireAnyRole(["super_admin", "ingeniero"])`.
- **Permisos duales**: la UI oculta acciones no autorizadas (`canWrite`) y el backend las bloquea en server actions. No se puede eludir la UI para modificar datos sin permiso.
- **UX mejorada**: `loading.tsx` por segmento (clientes, obras, detalle de obra, dashboard de cliente), `error.tsx` con boton de reintento, `not-found.tsx` personalizado.
- **Soft delete**: usuarios, clientes, obras, actualizaciones, comentarios y archivos usan borrado logico (`deletedAt`). Los archivos de actualizacion (`UpdateFile`) usan borrado fisico.

## Proximas mejoras recomendadas

- Agregar tests de integracion para server actions completas (no solo queries de permiso).
- Evaluar lazy loading de signed URLs si el volumen de archivos por obra crece significativamente.
- Agregar documentacion de despliegue (Vercel, Docker, etc.).
- Crear `dashboard/admin/page.tsx` como hub si se agregan mas modulos administrativos.
