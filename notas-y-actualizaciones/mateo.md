# Historial general del proyecto

> Este resumen fue generado a partir del estado actual del repositorio y del contexto disponible en la sesion. Si falta historial externo de OpenCode, no estaba accesible desde el proyecto.

---

## Resumen ejecutivo

**MYC** es una plataforma interna para una sola constructora que permite administrar clientes, obras, asignar responsables, publicar avances y centralizar la comunicacion de seguimiento.

| Aspecto | Detalle |
|---------|---------|
| **Framework** | Next.js 16.2.6 App Router |
| **Lenguaje** | TypeScript 5 (strict) |
| **ORM** | Prisma 7.8.0 |
| **Base de datos** | Supabase PostgreSQL 17.6 |
| **Autenticacion** | Supabase Auth (NO Auth.js/NextAuth) |
| **SSR** | `@supabase/ssr` 0.10.3 |
| **Estilos** | Tailwind CSS 4 |
| **Host DB** | `gbuihaneipkoyzynkrmk` (us-east-1) |
| **Pooler** | Supavisor Session Mode (`aws-1-us-west-2.pooler.supabase.com:5432`) |
| **MCP** | Supabase MCP configurado y funcional |

---

## Estado actual del proyecto

### Lo que funciona

- **Autenticacion**: Login, registro y logout con Supabase Auth via Server Actions. Retry de perfil post-registro (hasta 5 intentos)
- **Roles**: `super_admin`, `ingeniero`, `marketing`, `cliente` con guards en servidor
- **Sincronizacion**: Trigger `tr_sync_auth_user_profile` que crea perfil en `public.usuarios` al insertar en `auth.users`
- **Seed local**: `prisma/seed.ts` genera usuarios de prueba con `npm run db:seed`
- **Dashboard por rol**: Redireccion automatica segun rol. `super_admin` → `/dashboard/admin/users`
- **CRUD de clientes**: Crear, editar (preservando phone/document/address), soft-delete. `marketing` solo ve clientes activos en lectura. `cliente` bloqueado
- **CRUD de obras**: Crear con cliente + ingeniero principal, editar (preservando descripcion), archivar. Reglas: progreso 100 → completado, completado/cancelado → archivado
- **Asignaciones de obra**: Asignar/desasignar ingenieros y marketing. Reactivacion de asignaciones previas. Sin borrado fisico
- **Actualizaciones de obra**: Crear, editar (UI inline con `InlineUpdateEditor`), soft-delete. Cambio opcional de estado/progreso. Historial vinculado
- **Historial de estado/progreso**: Registro en `historial_estado_obra` en cada cambio relevante, con transacciones atomicas
- **Guard por obra asignada**: Ingeniero y marketing solo ven/operan obras donde estan asignados
- **Supabase Storage**: Subida y descarga de archivos con signed URLs (300s). Validacion de MIME types y tamanos. `React.cache` por request. **Solo legacy — archivos antiguos.**
- **Cloudinary Storage**: Servicio server-only para archivos nuevos. Upload/destroy/signed URL. `type: "upload"`, resource_type por MIME. Imagenes → `image`, Videos → `video`, PDF → `raw`. Carpeta `documents/` para PDF, `images/` para imagenes, `evidence/` para actualizaciones.
- **Visor PDF interno**: Ruta `/dashboard/projects/[projectId]/files/[fileId]` y `/dashboard/projects/[projectId]/updates/[updateId]/files/[fileId]`. Componente `PdfViewer` con react-pdf: pagina por pagina, zoom (+/-/reset), loading, error. Route handlers de descarga con `Content-Disposition: attachment` y nombre legible.
- **FilePreview mejorado**: PDFs → link al visor interno. Imagenes → miniatura + URL directa. Videos → badge + URL directa. FilePreview recibe `projectId`, `fileId`, `updateId` para rutear correctamente.
- **Control de videos**: `MAX_VIDEO_SIZE = 25 MB`. Maximo 1 video activo por actualizacion. Video solo permitido en actualizaciones (`ALLOWED_UPDATE_FILE_TYPES`), prohibido en archivos de obra (`ALLOWED_PROJECT_FILE_TYPES` sin video). Inputs con `accept` restrictivo.
- **Permisos de visualizacion**: `canViewProjectFile` y `canViewUpdateFile` — super_admin, asignados, cliente dueno de obra.
- **Comentarios**: CRUD completo de comentarios de actualizacion y comentarios generales de obra. Edicion inline con `InlineCommentEditor`
- **Vista del cliente**: Dashboard `/dashboard/client` con obras, progreso, actualizaciones, archivos, comentarios. Solo ve sus obras
- **RLS en 10 tablas**: 23 politicas SELECT con helper functions. `(SELECT auth.uid())` optimizado. `auth_rls_initplan` eliminado
- **Indexes de BD**: 20 indices compuestos y FK en 10 tablas
- **Supabase Realtime**: 7 tablas en publicacion, componente `ProjectRealtimeListener` con `router.refresh()`, debounce 2s, cleanup async seguro
- **Pruebas automatizadas**: 171 tests en 7 archivos (comentarios, archivos, proyectos, actualizaciones, asignaciones, clientes, visor PDF)
- **UX completa**: `loading.tsx` por segmento (4 skeletons), `error.tsx` con boton reintentar y link "Volver al dashboard", `not-found.tsx` personalizado
- **Cloudinary**: Integracion controlada para imagenes, videos y PDF nuevos. Supabase Storage legacy para archivos antiguos.
- **Visor PDF**: Render pagina por pagina con react-pdf, zoom, descarga con nombre legible.
- **Control de videos**: Maximo 1 video por actualizacion, 25 MB maximo. Solo desde actualizaciones, no desde archivos de obra.
- **Documentacion**: `README.md` tecnico completo, `CHANGELOG.md`, `.env.example` con placeholders seguros
- **Conexion local**: Prisma conecta via Supabase Session Pooler (IPv4)
- **Middleware**: `src/proxy.ts` activo (Next.js 16). Refresca sesion y protege `/dashboard`

### Pendientes menores

- Lazy loading de signed URLs si el volumen de archivos escala
- `loading.tsx` y `error.tsx` por segmento en subrutas de segundo nivel (opcional)
- Evaluar `type: "private"` o `type: "authenticated"` en Cloudinary si se requiere mayor seguridad documental (actualmente `type: "upload"` con URL no adivinable por UUID)

---

## Cambios implementados por modulo

### Autenticacion y usuarios

El proyecto usa **Supabase Auth** como proveedor de autenticacion. No se usa Auth.js ni NextAuth. Las contrasenas las gestiona Supabase internamente; no hay campo `password_hash` en el modelo Prisma.

| Archivo | Funcion |
|---------|---------|
| `src/lib/supabase/server.ts` | Cliente SSR con cookies de `next/headers` |
| `src/lib/supabase/client.ts` | Cliente browser-side con `createBrowserClient` |
| `src/lib/supabase/middleware.ts` | Helper `updateSession` (legacy, reemplazado en proxy) |
| `src/lib/supabase/admin.ts` | Cliente server-only con `SUPABASE_SERVICE_ROLE_KEY` |
| `src/lib/auth/actions.ts` | Server Actions: `signInAction`, `signUpAction`, `signOutAction` |
| `src/lib/auth/session.ts` | `getCurrentSession`, `getCurrentAuthUser`, `getCurrentUserProfile` |
| `src/lib/auth/guards.ts` | `requireAuth`, `requireActiveProfile`, `requireRole`, `requireAnyRole`, `requireSuperAdmin`, `getCurrentUserRole` |
| `src/lib/auth/types.ts` | Tipos `PrismaUser` y `UserRole` |
| `src/proxy.ts` | Middleware de Next.js: refresca sesion y protege `/dashboard` |

**Flujo de autenticacion**:

1. Registro (`/register`): `signUpAction` → `supabase.auth.signUp()` con `name` en `user_metadata` → trigger crea perfil en `public.usuarios` con rol `cliente`
2. Login (`/login`): `signInAction` → `supabase.auth.signInWithPassword()` → redirect `/dashboard`
3. Dashboard redirige segun rol: `super_admin` → `/dashboard/admin`, `ingeniero` → `/dashboard/engineer`, etc.
4. Logout: `signOutAction` → `supabase.auth.signOut()` → redirect `/login`
5. Middleware (`proxy.ts`): protege `/dashboard` redirigiendo a `/login` si no hay sesion

### Seed local de usuarios

Archivo: `prisma/seed.ts`

Crea o actualiza idempotentemente 4 usuarios de prueba via Supabase Admin API + Prisma.

| Email | Nombre | Rol | Cliente |
|-------|--------|-----|---------|
| `superadmin@test.local` | Super Admin Test | super_admin | No |
| `ingeniero@test.local` | Ingeniero Test | ingeniero | No |
| `marketing@test.local` | Marketing Test | marketing | No |
| `cliente@test.local` | Cliente Test | cliente | Si |

**Contrasena comun**: `Test123456!` (solo desarrollo local).

**Comando**: `npm run db:seed`

**Idempotencia**: Segunda ejecucion actualiza en vez de duplicar.

### Gestion de obras

Modelo Prisma: `Project` → tabla `public.obras`.

| Campo | Descripcion |
|-------|-------------|
| `id` | UUID |
| `clientId` | FK a `clientes` |
| `name` / `nombre` | Nombre de la obra |
| `description` / `descripcion` | Descripcion opcional |
| `currentStatus` / `estado_actual` | Enum: `planeacion`, `en_progreso`, `en_pausa`, `completado`, `cancelado` |
| `currentProgress` / `progreso_actual` | 0-100 |
| `startDate`, `estimatedEndDate` | Fechas opcionales |
| `archivedAt` / `archivada_en` | Se puebla al completar o cancelar |
| `createdBy` / `creado_por` | FK a `usuarios` |
| `updatedBy` / `actualizado_por` | FK a `usuarios` |
| `deletedAt` / `eliminado_en` | Soft delete |

**Archivos**:

| Archivo | Funcion |
|---------|---------|
| `src/lib/projects/queries.ts` | `listProjects(userId?)`, `getProjectById`, `listActiveClients`, `listActiveEngineers` |
| `src/lib/projects/actions.ts` | `createProjectAction`, `updateProjectAction`, `archiveProjectAction` |
| `src/lib/projects/permissions.ts` | `hasActiveProjectAssignment`, `canReadProject`, `canWriteProject`, `getAssignmentFilter`, `requireProjectWriteAccess` |
| `src/app/dashboard/projects/page.tsx` | Listado de obras (filtrado por asignacion) |
| `src/app/dashboard/projects/[projectId]/page.tsx` | Detalle de obra con asignaciones y actualizaciones |

**Reglas de negocio**:
- Solo `super_admin` e `ingeniero` pueden crear obras
- Toda obra requiere cliente e ingeniero principal
- Estado inicial: `planeacion`, progreso inicial: `0`
- Progreso 100 fuerza estado `completado`
- `completado` o `cancelado` → `archivada_en` poblado
- Soft delete via `eliminado_en`
- Ingeniero y marketing solo ven/operan obras donde tienen asignacion activa

### Asignaciones de obra

Modelo Prisma: `ProjectAssignment` → tabla `public.asignaciones_obra`.

| Campo | Descripcion |
|-------|-------------|
| `id` | UUID |
| `projectId` / `obra_id` | FK a `obras` |
| `userId` / `usuario_id` | FK a `usuarios` |
| `role` / `rol_asignacion` | Enum: `ingeniero`, `marketing` |
| `isPrincipal` / `es_principal` | Indica ingeniero principal |
| `assignedAt` / `asignado_en` | Fecha de asignacion |
| `unassignedAt` / `desasignado_en` | Soft unassign (null = activa) |

**Archivos**:

| Archivo | Funcion |
|---------|---------|
| `src/lib/projects/assignments/queries.ts` | `listProjectAssignments`, `listAssignableUsers`, `getPrimaryEngineer`, `isPrimaryEngineer`, `countActivePrimaryEngineers` |
| `src/lib/projects/assignments/actions.ts` | `assignUserToProjectAction`, `unassignUserFromProjectAction`, `setPrimaryEngineerAction` |

**Permisos**:
- `super_admin`: asigna/desasigna ingenieros y marketing. Cambia ingeniero principal
- Ingeniero principal: solo asigna/desasigna marketing
- Ingeniero no principal: solo visualiza
- Marketing: solo visualiza
- Cliente: bloqueado

**Reglas**:
- No duplicar asignaciones activas (si existe previa desasignada, se reactiva)
- Soft unassign via `desasignado_en` (sin DELETE)
- No dejar obra sin ingeniero principal
- Ingeniero principal no puede desasignarse a si mismo

### Actualizaciones de obra

Modelo Prisma: `ProjectUpdate` → tabla `public.actualizaciones_obra`.

| Campo | Descripcion |
|-------|-------------|
| `id` | UUID |
| `projectId` / `obra_id` | FK a `obras` |
| `authorId` / `autor_id` | FK a `usuarios` |
| `title` / `titulo` | Obligatorio |
| `description` / `descripcion` | Opcional |
| `effectiveDate` / `fecha_efectiva` | Fecha opcional |
| `resultingStatus` / `estado_resultante_opcional` | Estado resultante (opcional) |
| `resultingProgress` / `progreso_resultante_opcional` | Progreso resultante (opcional) |
| `editedAt` / `editado_en` | Fecha de edicion |
| `deletedAt` / `eliminado_en` | Soft delete |

**Archivos**:

| Archivo | Funcion |
|---------|---------|
| `src/lib/projects/updates/queries.ts` | `listProjectUpdates`, `getProjectUpdateById`, `canCreateProjectUpdate`, `canEditProjectUpdate`, `canDeleteProjectUpdate`, `getProjectStatusHistory` |
| `src/lib/projects/updates/actions.ts` | `createProjectUpdateAction`, `updateProjectUpdateAction`, `deleteProjectUpdateAction` |

**Permisos**:
- Ingeniero o marketing con asignacion activa: pueden crear
- `super_admin`: NO puede crear (LORE.md no lo incluye), pero puede ver/editar/eliminar cualquier actualizacion
- Autor: puede editar/eliminar su propia actualizacion
- Cliente: no puede crear, editar ni eliminar

**Reglas**:
- Titulo obligatorio, descripcion opcional
- Estado y progreso opcionales en la actualizacion
- Si cambia estado o progreso → se actualiza la obra y se crea historial con `relatedUpdateId`
- Progreso 100 fuerza completado
- Completado/cancelado → archivado
- Soft delete via `eliminado_en`
- Todo en transaccion atomica (`prisma.$transaction`)

### Historial de estado y progreso

Modelo Prisma: `ProjectStatusHistory` → tabla `public.historial_estado_obra`.

| Campo | Descripcion |
|-------|-------------|
| `id` | UUID |
| `projectId` / `obra_id` | FK a `obras` |
| `previousStatus` / `estado_anterior` | Estado antes del cambio |
| `newStatus` / `estado_nuevo` | Estado despues del cambio |
| `previousProgress` / `progreso_anterior` | Progreso antes |
| `newProgress` / `progreso_nuevo` | Progreso despues |
| `changedBy` / `cambiado_por` | FK a `usuarios` |
| `observation` / `observacion` | Nota opcional |
| `relatedUpdateId` / `actualizacion_id_relacionada` | FK a `actualizaciones_obra` (opcional) |

**Cuando se crea historial**:
1. Al **crear** una obra: entrada inicial (`null → planeacion`, `null → 0`, "Obra creada")
2. Al **editar** una obra: si cambia estado o progreso (sin cambio = sin historial)
3. Al **crear actualizacion**: si incluye cambio de estado/progreso
4. Al **archivar**: entrada "Obra archivada (soft delete)"

### Archivos y adjuntos

El proyecto tiene modelos de archivos en Prisma pero **no tiene integracion real con Supabase Storage**. El codigo esta preparado para recibir metadatos (URL, nombre, tipo, tamaño) pero las URLs deben generarse externamente o quedar como placeholder.

| Modelo | Tabla | Estado |
|--------|-------|--------|
| `UpdateFile` | `archivos_actualizacion` | Modelo definido. Sin integracion de Storage. Pendiente |
| `ProjectFile` | `archivos_obra` | Modelo definido. Sin integracion de Storage. Pendiente |

**Tipos de archivo**: `UpdateFileType` (`foto`, `video`), `ProjectFileType` (`foto`, `documento`, `pdf`, `otro`).

---

## Tabla de archivos importantes

| Archivo | Proposito | Estado |
|---------|-----------|--------|
| `prisma/schema.prisma` | Modelo de datos: 10 tablas, 6 enums | Completo |
| `prisma/migrations/20250101000000_init/migration.sql` | Migracion inicial | Aplicada |
| `prisma/seed.ts` | Seed de usuarios de prueba | Funcional |
| `prisma/sql/fk-usuarios-auth-users.sql` | FK `usuarios.id` → `auth.users.id` | Aplicado |
| `prisma/sql/sync-auth-users-profile.sql` | Trigger sincronizacion auth → public | Aplicado |
| `prisma.config.ts` | Configuracion Prisma 7 (datasource, migrations) | Completo |
| `src/lib/prisma.ts` | Singleton PrismaClient con adapter pg | Funcional |
| `src/lib/supabase/admin.ts` | Cliente Supabase con service_role (server-only) | Funcional |
| `src/lib/supabase/server.ts` | Cliente SSR con cookies | Funcional |
| `src/lib/supabase/client.ts` | Cliente browser | Funcional |
| `src/lib/auth/actions.ts` | Server Actions de auth (login, registro, logout) | Funcional |
| `src/lib/auth/session.ts` | Helpers de sesion y perfil | Funcional |
| `src/lib/auth/guards.ts` | Guards por rol | Funcional |
| `src/lib/auth/types.ts` | Tipos `PrismaUser`, `UserRole` | Completo |
| `src/lib/admin/users/actions.ts` | Admin de usuarios internos | Funcional |
| `src/lib/admin/users/queries.ts` | Queries de usuarios | Funcional |
| `src/lib/clients/actions.ts` | CRUD de clientes | Funcional |
| `src/lib/clients/queries.ts` | Queries de clientes | Funcional |
| `src/lib/projects/actions.ts` | CRUD de obras + historial | Funcional |
| `src/lib/projects/queries.ts` | Queries de obras (filtro por asignacion) | Funcional |
| `src/lib/projects/permissions.ts` | Helpers de permisos por obra y asignacion | Funcional |
| `src/lib/projects/assignments/actions.ts` | Asignar/desasignar/cambiar principal | Funcional |
| `src/lib/projects/assignments/queries.ts` | Queries de asignaciones | Funcional |
| `src/lib/projects/updates/actions.ts` | Crear/editar/eliminar actualizaciones | Funcional |
| `src/lib/projects/updates/queries.ts` | Queries de actualizaciones + permisos | Funcional |
| `src/app/dashboard/projects/page.tsx` | Listado de obras | Funcional |
| `src/app/dashboard/projects/[projectId]/page.tsx` | Detalle de obra (asignaciones + updates) | Funcional |
| `src/proxy.ts` | Middleware de sesion y proteccion `/dashboard` (Next.js 16) | Funcional |
| `src/components/comments/inline-comment-editor.tsx` | Edicion inline de comentarios (cliente) | Funcional |
| `src/components/updates/inline-update-editor.tsx` | Edicion inline de actualizaciones (cliente) | Funcional |
| `src/components/files/file-preview.tsx` | Preview de archivos con signed URL | Funcional |
| `src/components/realtime/project-realtime-listener.tsx` | Listener Realtime con router.refresh() | Funcional |
| `src/app/not-found.tsx` | Pagina 404 personalizada | Funcional |
| `src/app/dashboard/loading.tsx` | Spinner generico de carga | Funcional |
| `src/app/dashboard/error.tsx` | Pantalla de error con boton reintentar | Funcional |
| `src/app/dashboard/clients/loading.tsx` | Skeleton de tabla de clientes | Funcional |
| `src/app/dashboard/projects/loading.tsx` | Skeleton de tabla de obras | Funcional |
| `src/app/dashboard/projects/[projectId]/loading.tsx` | Skeleton de detalle de obra | Funcional |
| `src/app/dashboard/client/loading.tsx` | Skeleton de dashboard de cliente | Funcional |
| `tests/permissions/comments.test.ts` | Tests de permisos de comentarios | Funcional |
| `tests/permissions/files.test.ts` | Tests de permisos de archivos | Funcional |
| `tests/permissions/projects.test.ts` | Tests de permisos de obras | Funcional |
| `tests/permissions/updates.test.ts` | Tests de permisos de actualizaciones | Funcional |
| `tests/permissions/assignments.test.ts` | Tests de permisos de asignaciones | Funcional |
| `tests/permissions/clients.test.ts` | Tests de permisos de clientes | Funcional |
| `package.json` | Dependencias y scripts | Completo |
| `LORE.md` | Documento funcional del MVP (fuente de verdad) | Completo |
| `README.md` | Documentacion tecnica para onboarding | Completo |
| `CHANGELOG.md` | Registro cronologico de cambios | Completo |
| `.env.example` | Plantilla de variables de entorno | Completo |
| `notas-y-actualizaciones/mateo.md` | Este archivo — historial detallado | Actualizado |
| `src/lib/cloudinary/service.ts` | Servicio Cloudinary server-only: upload, destroy, signed URL, thumbnail | Funcional |
| `src/lib/projects/files/actions.ts` | Upload/delete/getUrl de archivos de obra (Cloudinary + Supabase) | Funcional |
| `src/lib/projects/updates/files/actions.ts` | Upload/delete/getUrl de archivos de actualizacion (Cloudinary + Supabase) | Funcional |
| `src/lib/projects/files/queries.ts` | Queries de archivos de obra + `canViewProjectFile` | Funcional |
| `src/lib/projects/updates/files/queries.ts` | Queries de archivos de actualizacion + `canViewUpdateFile` | Funcional |
| `src/components/files/pdf-viewer.tsx` | Visor PDF con react-pdf: pagina por pagina, zoom, loading, error | Funcional |
| `src/app/dashboard/projects/[projectId]/files/[fileId]/page.tsx` | Visor PDF de archivo de obra con descarga | Funcional |
| `src/app/dashboard/projects/[projectId]/updates/[updateId]/files/[fileId]/page.tsx` | Visor PDF de archivo de actualizacion con descarga | Funcional |
| `src/app/dashboard/projects/[projectId]/files/[fileId]/download/route.ts` | Route handler descarga PDF obra con nombre legible | Funcional |
| `src/app/dashboard/projects/[projectId]/updates/[updateId]/files/[fileId]/download/route.ts` | Route handler descarga PDF actualizacion con nombre legible | Funcional |
| `tests/permissions/pdf-viewer.test.ts` | Tests de permisos y acceso al visor PDF | Funcional |

---

## Tabla de permisos por rol

| Accion | super_admin | ing. asignado | ing. principal | mkt. asignado | cliente | no asignado |
|--------|-------------|--------------|----------------|--------------|---------|-------------|
| Ver listado de obras | Todas | Solo asignadas | Solo asignadas | Solo asignadas | Bloqueado | Bloqueado |
| Ver detalle de obra | Todas | Solo asignadas | Solo asignadas | Solo asignadas | Bloqueado | Bloqueado |
| Crear obra | SI | SI | SI | NO | NO | NO |
| Editar obra | Cualquiera | Solo asignadas | Solo asignadas | NO | NO | NO |
| Archivar obra | Cualquiera | Solo asignadas | Solo asignadas | NO | NO | NO |
| Asignar ingeniero | SI | NO | NO | NO | NO | NO |
| Asignar marketing | SI | NO | SI | NO | NO | NO |
| Desasignar ingeniero | SI | NO | NO | NO | NO | NO |
| Desasignar marketing | SI | NO | SI | NO | NO | NO |
| Cambiar ing. principal | SI | NO | NO | NO | NO | NO |
| Crear actualizacion | NO (LORE) | SI | SI | SI | NO | NO |
| Editar actualizacion propia | N/A | SI | SI | SI | NO | NO |
| Editar cualquier actualizacion | SI | NO | NO | NO | NO | NO |
| Eliminar actualizacion propia | N/A | SI | SI | SI | NO | NO |
| Eliminar cualquier actualizacion | SI | NO | NO | NO | NO | NO |
| Ver actualizaciones | SI | SI | SI | SI | NO | NO |
| Comentarios en obra | SI | SI | SI | SI | Sus obras | NO |

---

## Validaciones y reglas de seguridad

- **Validaciones en servidor**: todas las Server Actions validan permisos con guards (`requireAnyRole`, `requireSuperAdmin`, `requireProjectWriteAccess`, etc.)
- **No confiar en UI**: los botones se ocultan condicionalmente, pero los Server Actions validan independientemente
- **Usuarios activos**: `requireActiveProfile()` verifica `active === true` antes de permitir acciones
- **Usuarios no eliminados**: queries filtran `deletedAt: null`
- **Obras no eliminadas**: validacion en cada action (`project.deletedAt` check)
- **Asignaciones activas**: `unassignedAt: null` es condicion para considerar una asignacion vigente
- **Soft delete**: clientes, obras, actualizaciones y asignaciones usan borrado logico (`eliminado_en` o `desasignado_en`). Sin DELETE fisico
- **Sin Prisma en proxy**: `src/proxy.ts` solo usa `supabase.auth.getUser()` (sin consultas a DB)
- **No duplicar asignaciones**: `findFirst` con `unassignedAt: null` previo a crear. Reactivacion de previas desasignadas
- **No exponer claves**: `SUPABASE_SERVICE_ROLE_KEY` solo en `src/lib/supabase/admin.ts` con `import "server-only"`
- **Sin service role en cliente**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` para browser. Service role solo en servidor

---

## Comandos utiles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Next.js |
| `npm run build` | Build de produccion (TypeScript + Next.js) |
| `npm run start` | Iniciar servidor en produccion |
| `npm run lint` | ESLint |
| `npm run db:seed` | Ejecutar seed de usuarios de prueba |
| `npx prisma validate` | Validar schema de Prisma |
| `npx prisma generate` | Generar cliente Prisma |
| `npx prisma migrate status` | Estado de migraciones |
| `npx prisma migrate deploy` | Aplicar migraciones pendientes (produccion) |
| `npx prisma migrate resolve --applied <name>` | Marcar migracion como aplicada (sin ejecutar SQL) |

---

## Riesgos pendientes

| Riesgo | Severidad | Explicacion | Recomendacion |
|--------|-----------|-------------|---------------|
| `SECURITY DEFINER` en trigger | **Resuelto** | `sync_auth_user_profile()` movida de `public` a `myc_internal`. Permisos revocados. Warning eliminado | — |
| Sin indexes en FK columns | **Resuelto** | 20 indices compuestos y FK aplicados en las 10 tablas | — |
| Comentarios pendientes | **Resuelto** | CRUD completo de `UpdateComment` y `ProjectComment` con permisos por rol y edicion inline | — |
| Vista privada del cliente | **Resuelto** | Dashboard `/dashboard/client` funcional con obras, actualizaciones, archivos y comentarios | — |
| Guard por obra asignada para comentarios | **Resuelto** | Integrado en queries de permisos de comentarios (`canCreateProjectComment`, `canCreateUpdateComment`) | — |
| Politicas de Storage pendientes | **Resuelto** | Bucket privado, signed URLs 300s, validacion MIME/tamano, `React.cache` por request | — |
| Sin integracion Supabase Storage | **Resuelto** | Subida/descarga con Server Actions. Modelos `UpdateFile` y `ProjectFile` con datos reales | — |
| RLS deshabilitado | **Resuelto** | 23 politicas SELECT con helper functions. `(SELECT auth.uid())` optimizado en 16 ocurrencias | — |
| Pruebas automatizadas | **Resuelto** | 74 tests en 6 archivos con Vitest. Cobertura de permisos por rol | — |
| Sin documentacion de onboarding | **Resuelto** | `README.md` tecnico, `CHANGELOG.md`, `.env.example`, `AGENTS.md`, skills del proyecto | — |
| Cobertura de tests de server actions | **Bajo** | 74 tests cubren queries de permiso. Las acciones completas no tienen test directo (usan redirect) | Agregar tests de integracion con mock de redirect si se requiere cobertura total |
| Sin `.env.example` | **Resuelto** | Creado con 5 variables documentadas y placeholders seguros | — |

---

## Proximas tareas recomendadas

Ordenadas por prioridad:

1. **Commit y push**: Consolidar todos los cambios (Cloudinary, PDF viewer, video control, navegacion). `git add . && git commit -m "feat: integracion Cloudinary, visor PDF, control videos" && git push`
2. **Despliegue**: Configurar entorno de produccion (Vercel o similar) con 8 variables de entorno. Verificar RLS y Cloudinary en produccion.
3. **Monitoreo de costos Cloudinary**: Revisar consumo de storage + ancho de banda en dashboard de Cloudinary tras el despliegue.
4. **Lazy loading de signed URLs**: Si el volumen de archivos por obra crece, implementar firma de URL al hacer clic en "Ver" en lugar de prefirmar todas.
5. **Evaluar seguridad documental**: Si se requiere mayor proteccion para PDF, evaluar `type: "private"` o `type: "authenticated"` en Cloudinary con URL firmada por request.

---

## Historial resumido de implementacion

1. **Configuracion inicial**: Next.js + Prisma + Supabase. Schema con 10 tablas y 6 enums. Migracion aplicada via MCP
2. **Conexion local**: Configuracion de Supavisor Session Pooler para IPv4. `migrate resolve` para sincronizar estado
3. **Autenticacion**: Login, registro y logout con Supabase Auth + Supabase SSR. Server Actions, paginas `/login`, `/register`, `/dashboard`
4. **Guards por rol**: `requireAuth`, `requireActiveProfile`, `requireRole`, `requireAnyRole`, `requireSuperAdmin`. Dashboards por rol
5. **Prueba de trigger**: Verificacion de sincronizacion `auth.users → public.usuarios` con usuario real
6. **Admin de usuarios internos**: `super_admin` crea/edita/desactiva usuarios `ingeniero` y `marketing`. Supabase Admin API + Prisma
7. **CRUD de clientes**: Crear cliente con cuenta Supabase Auth asociada. Soft delete. Permisos por rol
8. **CRUD de obras**: Crear obra con cliente e ingeniero principal. Reglas de progreso/estado. Historial automatico
9. **Asignaciones de obra**: Asignar/desasignar ingenieros y marketing. Cambiar ingeniero principal. Reactivacion. Permisos por rol y jerarquia
10. **Guard por obra asignada**: Filtrado de queries por asignacion. Validacion en Server Actions. Ingeniero solo opera obras asignadas
11. **Actualizaciones de obra**: Crear con titulo, descripcion, cambio opcional de estado/progreso. Historial vinculado. Soft delete
12. **Seed local**: Usuarios de prueba idempotentes con `npm run db:seed`
13. **RLS en 10 tablas**: 23 politicas SELECT con helper functions, `(SELECT auth.uid())` optimizado, `auth_rls_initplan` eliminado
14. **Indices de BD**: 20 indices compuestos y FK en 10 tablas
15. **Supabase Storage**: Bucket privado `myc-project-files`, URLs firmadas 300s, subida/descarga con Server Actions
16. **Supabase Realtime**: 7 tablas en publicacion, componente listener con `router.refresh()`, debounce 2s
17. **Vista cliente**: Dashboard `/dashboard/client` con proyectos, estado, progreso, actualizaciones, comentarios, archivos (read-only)
18. **Endurecimiento RLS**: Reemplazo de `auth.uid()` por `(SELECT auth.uid())` en 16 ocurrencias, 6 warnings de initplan eliminados
19. **Endurecimiento sync_auth_user_profile()**: Funcion movida de `public` a `myc_internal`, permisos revocados para anon/authenticated/PUBLIC, trigger actualizado, warning SECURITY DEFINER eliminado
20. **Leaked Password Protection**: Identificado warning `auth_leaked_password_protection` en advisors, pendiente de activacion manual en Supabase Dashboard
21. **Estabilizacion del MVP (2026-05-27)**: Correccion de bugs criticos/altos/medios/bajos, 34 tests nuevos, UX completa, documentacion tecnica y .env.example. Ver seccion abajo.

---

## Estabilizacion del MVP — 2026-05-27

> Sesion de revision, correccion de bugs, mejora de UX, tests, documentacion y hardening del proyecto MYC.

### Bugs corregidos (13)

| Nº | Severidad | Bug | Archivo | Solucion |
|---|---|---|---|---|
| 1 | Critica | `super_admin` redirigido a `/dashboard/admin` (no existe) | `dashboard/page.tsx` | Cambiado a `/dashboard/admin/users` |
| 2 | Alta | Edicion inline de cliente perdia `phone`, `document`, `address` | `dashboard/clients/page.tsx` | Inputs ocultos con valores actuales |
| 3 | Alta | Edicion inline de obra perdia `description` | `dashboard/projects/page.tsx` | Input oculto con `project.description` |
| 4 | Alta | Sin UI para editar actualizaciones | `projects/[projectId]/page.tsx` | Componente `InlineUpdateEditor` |
| 5 | Alta | `generateSignedUrl` sin cache (N llamadas por request) | `lib/projects/storage.ts` | Envuelto en `React.cache()` |
| 6 | Media | `super_admin` veia dashboard de cliente | `dashboard/client/page.tsx` | Redirect a `/dashboard/admin/users` |
| 7 | Media | Props `canEdit`/`canDelete` invertidas semanticamente | `dashboard/client/page.tsx` | Importadas y usadas por separado |
| 8 | Media | `<a href>` en login/register (full reload) | `(auth)/login`, `(auth)/register` | Reemplazado por `<Link>` |
| 9 | Media | Link "Volver al admin" roto | `dashboard/admin/users/page.tsx` | Cambiado a `/dashboard/admin/users` |
| 10 | Media | Estado `en_pausa` sin color distintivo | Tabla y detalle de proyectos | `bg-yellow-100 text-yellow-800` |
| 11 | Media | Desactivar usuario no invalidaba sesiones Supabase | `lib/admin/users/actions.ts` | `signOut` + `try/catch` |
| 12 | Media | Condicion de carrera perfil post-registro | `lib/auth/actions.ts` | Retry 5x300ms via admin client |
| 13 | Baja | Cleanup async de canales Realtime sin `.catch()` | `project-realtime-listener.tsx` | `.catch(() => {})` |

### Mejoras de UX (7)

| Archivo | Descripcion |
|---|---|
| `dashboard/loading.tsx` | Spinner generico como fallback |
| `dashboard/error.tsx` | Mensaje amigable + boton reintentar |
| `dashboard/clients/loading.tsx` | Skeleton de tabla con 4 filas |
| `dashboard/projects/loading.tsx` | Skeleton de tabla con 5 filas + progreso |
| `dashboard/projects/[projectId]/loading.tsx` | Skeleton de detalle con secciones |
| `dashboard/client/loading.tsx` | Skeleton de cards de obras |
| `not-found.tsx` | Pagina 404 personalizada con diseno MYC |

### Ajustes de permisos (1)

| Cambio | Archivo | Descripcion |
|---|---|---|
| Marketing solo ve clientes activos | `lib/clients/queries.ts` + `dashboard/clients/page.tsx` | `listClients(true)` filtra `user.active === true` |

### Tests nuevos (34 tests en 4 archivos)

| Archivo | Tests | Funciones testeadas |
|---|---|---|
| `tests/permissions/projects.test.ts` | 12 | `hasActiveProjectAssignment`, `canReadProject`, `canWriteProject` |
| `tests/permissions/updates.test.ts` | 13 | `canCreateProjectUpdate`, `canEditProjectUpdate`, `canDeleteProjectUpdate` |
| `tests/permissions/assignments.test.ts` | 3 | `isPrimaryEngineer` |
| `tests/permissions/clients.test.ts` | 3 | `listClients` (filtro `onlyActiveUsers`) |

**Total**: 74 tests en 6 archivos (40 existentes + 34 nuevos).

### Documentacion nueva (4 archivos)

| Archivo | Contenido |
|---|---|
| `README.md` | Documentacion tecnica completa (stack, instalacion, rutas, roles, permisos, flujo auth, pruebas, validacion) |
| `CHANGELOG.md` | Registro cronologico de cambios con formato Keep a Changelog |
| `.env.example` | Plantilla con 5 variables de entorno, placeholders seguros y comentarios |
| `notas-y-actualizaciones/mateo.md` | Este archivo — actualizado con estado real actual |

### Comandos de validacion (todos pasan)

| Comando | Resultado |
|---|---|
| `npx eslint --cache .` | 0 errores, 0 warnings |
| `npx vitest run` | 6 archivos, 74 tests pasan |
| `npx next build` | Compilacion exitosa, TypeScript OK, 14 paginas, Proxy activo |

### Decisiones tecnicas clave documentadas

- Next.js 16 usa `src/proxy.ts` como middleware (no `middleware.ts`)
- Prisma Client generado en `src/generated/prisma/`
- `React.cache()` en `generateSignedUrl` por request
- `try/catch` en `signOut` de Supabase Auth al desactivar usuarios
- Redirect para roles desconocidos en `/dashboard`
- `onlyActiveUsers` en `listClients` para marketing
- InlineCommentEditor recibe `canEdit` semanticamente correcto
- Formularios de comentarios con `required` en frontend

---

## Integracion Cloudinary Controlado — 2026-06-02

> Sesion de implementacion de Cloudinary como proveedor multimedia, migracion de PDF, visor PDF interno, control de videos, correccion de bugs de navegacion y cambios de limites de archivos.

### Resumen de cambios en esta sesion

| Area | Cambios |
|------|---------|
| **Limites archivos** | `MAX_FILE_SIZE`: 10 MiB → 10 MB decimal (10,000,000 bytes). `bodySizeLimit`: 12mb → 60mb. `MAX_VIDEO_SIZE`: 50 MB → 25 MB. |
| **Cloudinary** | Nuevo servicio `src/lib/cloudinary/service.ts`. Upload, destroy, signed URL, thumbnail. `type: "upload"`, `resource_type` segun MIME. |
| **Prisma** | `provider` y `providerId` en `UpdateFile` y `ProjectFile`. SQL aplicado via Supabase. |
| **Backend** | `resolveStorageProvider`: todo nuevo → Cloudinary. Upload/delete/getUrl bifurcan por provider. `generateSignedUrl`: Cloudinary → `secure_url` directo, Supabase → signed URL 300s. |
| **PDF en Cloudinary** | `resource_type: "raw"`, carpeta `documents/`. `stripExtension()` evita `.pdf.pdf`. `getResourceType("application/pdf")` → `"raw"`. |
| **Visor PDF** | 4 rutas nuevas: visor obra, visor update, descarga obra, descarga update. Componente `PdfViewer` con react-pdf. `canViewProjectFile`/`canViewUpdateFile`. |
| **FilePreview** | PDFs → link a visor interno. Imagen/video → URL directa. Props `projectId`, `fileId`, `updateId`. |
| **Control video** | `MAX_VIDEO_SIZE = 25 MB`. Maximo 1 video activo por update. Contador `fileType: "video"` + `deletedAt: null`. Error `video-limit-reached`. |
| **Navegacion** | Auditoria 35 links. 0 incorrectos. Error boundary: agregado "Volver al dashboard". |
| **UI** | `accept` restrictivo en inputs. Help text actualizado: "Fotos, PDF o 1 video corto por actualizacion. Video maximo 25 MB." |
| **Tests** | 171 tests en 7 archivos (+97 tests respecto a la estabilizacion del MVP). |
| **Variables entorno** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` en `.env.local` y `.env.example`. |

### Linea de tiempo de cambios

1. **FilePreview bug fix**: `fileType="video"` no mostraba badge "Video". Mapeo corregido de enums Prisma a MIME types.
2. **Pruebas MIME/extension**: +32 tests para `ALLOWED_PROJECT_FILE_TYPES`, `ALLOWED_UPDATE_FILE_TYPES`, `isValidExtension`, `ALLOWED_VIDEO_TYPES`.
3. **MAX_FILE_SIZE**: cambiado de `10 * 1024 * 1024` a `10 * 1000 * 1000` (10 MB decimal = 10,000 KB).
4. **bodySizeLimit**: `next.config.ts` → `experimental.serverActions.bodySizeLimit: "60mb"` para aceptar videos.
5. **Analisis Cloudinary**: Auditoria de 18 areas. Veredicto: no recomendable. Usuario decidio proceder.
6. **Servicio Cloudinary**: `src/lib/cloudinary/service.ts` con `uploadToCloudinary`, `destroyCloudinaryFile`, `getCloudinarySignedUrl`, `getCloudinaryThumbnailUrl`, `isCloudinaryConfigured`. Configuracion desde `CLOUDINARY_*` env vars. `type: "upload"`, `resource_type` detectado por MIME.
7. **Campos Prisma**: `provider String?` y `providerId String?` en `UpdateFile` y `ProjectFile`. SQL: `ALTER TABLE ADD COLUMN IF NOT EXISTS proveedor TEXT` para ambas tablas.
8. **storage.ts**: `resolveStorageProvider` centralizado. `generateSignedUrl` acepta record `{provider, providerId, url}` y bifurca.
9. **Upload actions**: Bifurcacion Cloudinary/Supabase en `uploadProjectFileAction` y `uploadUpdateFileAction`. Si Cloudinary falla → limpieza de huerfano. Si Prisma falla tras Cloudinary → `destroyCloudinaryFile`.
10. **Delete actions**: Deteccion de provider. Cloudinary → `destroyCloudinaryFile`. Supabase → `supabase.storage.remove`.
11. **Queries**: `listProjectFiles`, `listProjectUpdates`, `listClientProjects` incluyen `provider` y `providerId` en sus selects.
12. **Vistas**: `generateSignedUrl(file.url)` → `generateSignedUrl(file)` en `[projectId]/page.tsx` y `client/page.tsx`.
13. **.env.example y .env.local**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
14. **Credenciales reales**: cloud_name=`dnfgkdp6g` configurado en `.env.local`.
15. **Fix Cloudinary 404**: `type: "private"` → `type: "upload"`. `generateSignedUrl` retorna `record.url` (secure_url) directo en vez de regenerar signed URL con `cloudinary.url()`.
16. **Fix PDF extension**: `public_id` usaba `Date.now()` + `unique_filename: true` → cambiado a `crypto.randomUUID()` sin `unique_filename`. `stripExtension()` evita `.pdf.pdf`.
17. **Fix PDF resource_type**: `getResourceType("application/pdf")` → `"raw"` (antes `"image"`). Carpeta `documents/` (antes `images/`).
18. **Fix double extension**: `stripExtension(filename)` remueve extension del public_id antes de subir.
19. **Fix delete para PDF**: delete actions detectan `.pdf` en URL → `resourceType: "raw"`.
20. **Fix video delete**: delete actions detectan video por extension → `resourceType: "video"`.
21. **Auditoria navegacion**: 35 links/botones revisados. Todos correctos. `router.back()` no usado para navegacion.
22. **Error boundary**: Agregado `Link` "Volver al dashboard" → `/dashboard` (redirect por rol) en `dashboard/error.tsx`.
23. **Control video**: `MAX_VIDEO_SIZE`: 50→25 MB. Limite 1 video activo por update con `prisma.updateFile.count({fileType: "video", deletedAt: null})`. Error `video-limit-reached`. Help text actualizado.
24. **Logs diagnosticos**: Agregados temporalmente con prefijo `[MYC-UPLOAD]`, `[MYC-URL]`, `[MYC-PROVIDER]`. Luego limpiados, dejando solo `console.error` para fallos.
25. **Validacion final**: 171 tests, ESLint 0/0, build 17 rutas.

### Arquitectura final de almacenamiento

```
Todos los archivos NUEVOS → Cloudinary
  ├── Imagenes → resource_type: "image", carpeta: images/ o evidence/
  ├── Videos   → resource_type: "video", carpeta: evidence/ (solo updates, max 1, 25 MB)
  └── PDF      → resource_type: "raw",   carpeta: documents/

Archivos ANTIGUOS → Supabase Storage
  └── provider = null o "supabase" → signed URL 300s

Base de datos
  ├── provider: "cloudinary" | "supabase" | null
  ├── providerId: public_id (Cloudinary) o null (Supabase)
  └── url: secure_url (Cloudinary) o path interno (Supabase)

generateSignedUrl
  ├── provider === "cloudinary" → retorna record.url (secure_url directo)
  └── else → supabase.storage.createSignedUrl(path, 300)
```

### Estrategia Cloudinary por tipo

| Tipo | resource_type | Carpeta obra | Carpeta update | URL |
|------|--------------|-------------|---------------|-----|
| Imagen (jpg/png/webp) | `image` | `images/` | `evidence/` | secure_url directo |
| Video (mp4/webm/mov) | `video` | N/A (prohibido) | `evidence/` | secure_url directo |
| PDF | `raw` | `documents/` | `documents/` | secure_url directo |

### Control de videos — reglas

| Regla | Implementacion |
|-------|---------------|
| Solo en actualizaciones | `ALLOWED_PROJECT_FILE_TYPES` sin video. `accept` en input de obra sin `.mp4,.webm,.mov`. |
| Maximo 25 MB | `MAX_VIDEO_SIZE = 25 * 1024 * 1024` |
| Maximo 1 por update | `prisma.updateFile.count({updateId, fileType: "video", deletedAt: null})` antes del upload |
| Video eliminado no cuenta | `deletedAt: null` en el filtro de conteo |
| Cliente no puede subir | `canUploadUpdateFile` retorna false para cliente |

### Visor PDF — rutas nuevas

| Ruta | Funcion | Permiso |
|------|---------|---------|
| `/dashboard/projects/[projectId]/files/[fileId]` | Visor PDF obra (react-pdf) | `canViewProjectFile` |
| `/dashboard/projects/[projectId]/files/[fileId]/download` | Descarga PDF obra | `canViewProjectFile` |
| `/dashboard/projects/[projectId]/updates/[updateId]/files/[fileId]` | Visor PDF update | `canViewUpdateFile` |
| `/dashboard/projects/[projectId]/updates/[updateId]/files/[fileId]/download` | Descarga PDF update | `canViewUpdateFile` |

### Variables de entorno actuales

```bash
# Supabase (existentes)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Base de datos (existentes)
DATABASE_URL
DIRECT_URL

# Cloudinary (nuevas — SIN NEXT_PUBLIC_)
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

### Estado actual de tests

| Archivo | Tests | Area |
|---------|-------|------|
| `permissions/files.test.ts` | ~57 | Permisos archivos, MIME, extension, provider, signed URL, video limits |
| `permissions/updates.test.ts` | ~20 | Permisos actualizaciones, delete rollback |
| `permissions/assignments.test.ts` | ~20 | Permisos asignaciones |
| `permissions/clients.test.ts` | ~20 | Permisos clientes |
| `permissions/comments.test.ts` | ~20 | Permisos comentarios |
| `permissions/projects.test.ts` | ~15 | Permisos obras |
| `permissions/pdf-viewer.test.ts` | ~21 | Permisos y acceso visor PDF |
| **Total** | **171** | **7 archivos** |

### Comandos de validacion (todos pasan)

| Comando | Resultado |
|---|---|
| `npx prisma generate` | OK |
| `npx prisma validate` | Schema valido |
| `npx eslint --cache .` | 0 errores, 0 warnings |
| `npx vitest run` | 7 archivos, 171 tests pasan |
| `npx next build` | 17 rutas compiladas, TypeScript OK |

### Riesgos pendientes

| Riesgo | Severidad | Recomendacion |
|--------|-----------|---------------|
| Cloudinary `type: "upload"` → URL accesible sin autenticacion si se conoce el public_id | Baja | public_id incluye `crypto.randomUUID()` — imposible de adivinar. Evaluar `type: "private"` en el futuro si se requiere mayor seguridad. |
| `bodySizeLimit: 60mb` requiere reinicio del dev server tras cambio en next.config.ts | Baja | Documentado en instrucciones de revision. |
| Supabase Storage legacy — archivos antiguos dependen de bucket `myc-project-files` | Media | Mantener bucket. No migrar archivos antiguos sin plan. |
| `.env.local` contiene credenciales reales de Cloudinary | Baja | No trackeado por Git (`.gitignore` cubre `.env*`). |

---

## Configuracion inicial — version anterior

> Las secciones siguientes documentan la configuracion inicial y la estabilizacion del MVP (sesiones anteriores).
