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
- **Supabase Storage**: Subida y descarga de archivos con signed URLs (300s). Validacion de MIME types y tamanos. `React.cache` por request
- **Comentarios**: CRUD completo de comentarios de actualizacion y comentarios generales de obra. Edicion inline con `InlineCommentEditor`
- **Vista del cliente**: Dashboard `/dashboard/client` con obras, progreso, actualizaciones, archivos, comentarios. Solo ve sus obras
- **RLS en 10 tablas**: 23 politicas SELECT con helper functions. `(SELECT auth.uid())` optimizado. `auth_rls_initplan` eliminado
- **Indexes de BD**: 20 indices compuestos y FK en 10 tablas
- **Supabase Realtime**: 7 tablas en publicacion, componente `ProjectRealtimeListener` con `router.refresh()`, debounce 2s, cleanup async seguro
- **Pruebas automatizadas**: 74 tests en 6 archivos (comentarios, archivos, proyectos, actualizaciones, asignaciones, clientes)
- **UX completa**: `loading.tsx` por segmento (4 skeletons), `error.tsx` con boton reintentar, `not-found.tsx` personalizado
- **Documentacion**: `README.md` tecnico completo, `CHANGELOG.md`, `.env.example` con placeholders seguros
- **Conexion local**: Prisma conecta via Supabase Session Pooler (IPv4)
- **Middleware**: `src/proxy.ts` activo (Next.js 16). Refresca sesion y protege `/dashboard`

### Pendientes menores

- Tests de integracion directa para server actions (solo queries de permiso testeadas)
- Lazy loading de signed URLs si el volumen de archivos escala
- `loading.tsx` y `error.tsx` por segmento en subrutas de segundo nivel (opcional)
- `dashboard/admin/page.tsx` como hub si se agregan mas modulos administrativos (opcional)

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

1. **Commit y push**: Consolidar todos los cambios de estabilizacion en el repositorio. `git add . && git commit -m "feat: estabilizacion del MVP" && git push`
2. **Despliegue**: Configurar entorno de produccion (Vercel o similar) con las 5 variables de entorno. Aplicar migraciones. Verificar RLS en produccion
3. **Tests de integracion para server actions**: Pasar de 74 tests de queries de permiso a tests de acciones completas con mock de `redirect` y `revalidatePath`
4. **Lazy loading de signed URLs**: Si el volumen de archivos por obra crece, implementar firma de URL al hacer clic en "Ver" en lugar de prefirmar todas
5. **`dashboard/admin/page.tsx`**: Hub administrativo si se agregan mas modulos de administracion (reportes, configuracion, logs)

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
