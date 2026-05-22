# MYC Task Backlog

## Estado Actual Detectado

El proyecto tiene autenticación funcional con Supabase Auth: Google OAuth, email/password login y registro, sesión SSR con cookies, ruta protegida `/protected` que valida sesión con `getClaims()` + `getUser()`, logout, y seed de administrador idempotente. Hay documentación básica (README, LORE, .env.example, 6 skills en `.agents/skills/`), Prisma configurado sin modelos, Supabase libs (server, client, env, proxy), y una página home con formularios de auth. No hay modelos de negocio, dashboard autenticado, RLS, Storage, perfiles de usuario, roles del dominio MYC, testing, ni deploy configurado.

**Rama actual:** `kevin` | **Stack:** Next.js 16.2.6, React 19.2.4, TypeScript strict, Tailwind CSS 4, Supabase JS/SSR, Prisma 7.8.

---

## Reglas Para Ejecutar Tareas

- Trabajar una tarea a la vez. No avanzar a la siguiente sin completar la anterior.
- No mezclar tareas no relacionadas en un mismo commit.
- No implementar features no documentadas en LORE.md.
- Validar con `npm run lint` y `npm run build` después de cada tarea de código.
- No subir secretos a Git. `.env.local` está en `.gitignore`.
- Mantener `.env.local` fuera de Git. No leer ni imprimir valores reales.
- Respetar `LORE.md` como fuente de verdad y `.agents/skills/` como documentación técnica.
- No agregar dependencias sin justificación clara y aprobación.
- Documentar decisiones técnicas en `LORE.md` cuando afecten la arquitectura.
- Mantener código en inglés, UI en español, documentación en español.
- TypeScript strict, no `any`.

---

## Leyenda De Prioridad

| Prioridad | Significado |
|---|---|
| **P0** | Bloqueante o base necesaria |
| **P1** | Importante para avanzar |
| **P2** | Mejora o preparación |
| **P3** | Opcional o futuro |

---

## Tareas

---

### Fase 0 — Limpieza Y Base

---

#### TASK-001: Ignorar archivos generados no versionables

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** Configuración
**Tamaño:** XS
**Depende de:** Ninguna
**Objetivo:** Agregar `repomix-output.xml` y `skills-lock.json` a `.gitignore` para evitar commits accidentales de archivos generados.
**Archivos sugeridos:** `.gitignore`
**Pasos:**
1. Abrir `.gitignore`.
2. Agregar línea `repomix-output.xml`.
3. Agregar línea `skills-lock.json`.
**Criterios de aceptación:**
- `git status` no muestra `repomix-output.xml` ni `skills-lock.json` como untracked.
- `npm run lint` pasa sin errores.
**Validación:** `git status` después del cambio.
**Notas:** Son archivos generados por herramientas externas, no parte del proyecto.

---

#### TASK-002: Verificar alineación entre README.md, LORE.md y código actual

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Documentación
**Tamaño:** XS
**Depende de:** Ninguna
**Objetivo:** Confirmar que README.md, LORE.md y las skills documentan exactamente lo que existe en código, sin referencias a features no implementadas ni omisiones.
**Archivos sugeridos:** `README.md`, `LORE.md`, `.agents/skills/myc-architecture/SKILL.md`, `.agents/skills/project-best-practices/SKILL.md`
**Pasos:**
1. Leer cada archivo de documentación.
2. Confrontar cada afirmación técnica contra el código en `src/`.
3. Listar discrepancias encontradas.
4. Si hay discrepancias, crear tareas de corrección específicas.
**Criterios de aceptación:**
- Lista de discrepancias documentada (puede quedar en el PR o en una nota).
- Si no hay discrepancias, se marca como completada.
**Validación:** Revisión manual de cada archivo vs código.
**Notas:** Tarea de auditoría, no de implementación. Puede generar subtareas.

---

#### TASK-003: Documentar estado real de autenticación en LORE.md

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Documentación
**Tamaño:** XS
**Depende de:** TASK-002
**Objetivo:** Agregar en LORE.md una sección que describa exactamente qué proveedores de auth están implementados, cómo funcionan y sus limitaciones actuales.
**Archivos sugeridos:** `LORE.md`
**Pasos:**
1. Leer sección 1.1 actual de LORE.md.
2. Agregar subsección "Estado actual de autenticación".
3. Documentar: Google OAuth, email/password, SSR con cookies, seed admin, ruta protegida, validación servidor.
4. Documentar limitaciones: sin perfiles, sin roles MYC, sin RLS, sin autorización por obra.
**Criterios de aceptación:**
- Cualquier desarrollador puede entender qué auth existe y qué falta leyendo LORE.md.
**Validación:** Lectura del archivo actualizado.

---

#### TASK-004: Agregar script de generación de cliente Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma
**Tamaño:** XS
**Depende de:** Ninguna
**Objetivo:** Agregar script `"db:generate"` en `package.json` para `npx prisma generate` y verificar que el cliente Prisma se genera correctamente.
**Archivos sugeridos:** `package.json`, `src/generated/prisma/`
**Pasos:**
1. Abrir `package.json`.
2. Agregar `"db:generate": "prisma generate"` en scripts.
3. Ejecutar `npm run db:generate`.
4. Verificar que se crean archivos en `src/generated/prisma/`.
**Criterios de aceptación:**
- `npm run db:generate` ejecuta `prisma generate` sin errores.
- Los tipos generados existen en `src/generated/prisma/`.
**Validación:** `npm run db:generate` seguido de `Get-ChildItem src/generated/prisma/`.
**Notas:** Prisma 7.8 usa `prisma-client` como provider (no `prisma-client-js`). El output está configurado a `../src/generated/prisma`.

---

#### TASK-005: Definir estrategia para mapeo de roles Supabase Auth → MYC

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Arquitectura
**Tamaño:** S
**Depende de:** Ninguna
**Objetivo:** Decidir y documentar cómo se mapearán los roles de negocio MYC (`super_admin`, `ingeniero`, `marketing`, `cliente`) en Supabase Auth, y cómo integrar el actual `app_metadata.role = "admin"` del seed con esta estrategia.
**Archivos sugeridos:** `LORE.md`, `.agents/skills/myc-architecture/SKILL.md`
**Pasos:**
1. Leer LORE.md sección 3 (Roles del sistema: super_admin, ingeniero, marketing, cliente).
2. Leer seed-admin.mjs (actualmente asigna `role: "admin"` en app_metadata).
3. Evaluar dos opciones: (a) `app_metadata.role` con string, (b) tabla `profiles` en Prisma con FK a `auth.users`.
4. Decidir si el seed debe crear el usuario con `role: "super_admin"` en lugar de `"admin"`.
5. Documentar la decisión en LORE.md y en myc-architecture SKILL.md.
**Criterios de aceptación:**
- Decisión documentada con opciones evaluadas y opción elegida.
- Seed admin y ruta protegida se actualizan si la decisión cambia el nombre del rol (tarea separada).
**Validación:** Revisión de LORE.md y myc-architecture/SKILL.md.
**Notas:** Esta decisión impacta todas las tareas posteriores de autorización. No implementar hasta tener decisión clara. La skill de Supabase advierte que `user_metadata` es inseguro para autorización; usar `app_metadata`.

---

### Fase 1 — Modelo De Datos Y Perfiles

---

#### TASK-006: Definir si habrá tabla `profiles` en Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Arquitectura
**Tamaño:** XS
**Depende de:** TASK-005
**Objetivo:** Decidir si los datos de perfil de usuario (nombre, rol MYC, activo) se almacenan en una tabla `profiles` de Prisma con FK a `auth.users`, o si se usa exclusivamente `app_metadata` de Supabase Auth.
**Archivos sugeridos:** `LORE.md`, `.agents/skills/myc-architecture/SKILL.md`
**Pasos:**
1. Evaluar ventajas de tabla profiles: consultas SQL directas, joins con modelos MYC, independencia de Supabase Auth.
2. Evaluar ventajas de app_metadata: sincronización automática con JWT, sin tabla adicional.
3. Decidir y documentar.
**Criterios de aceptación:**
- Decisión documentada con justificación.
**Validación:** Revisión de LORE.md.
**Notas:** Dado que MYC usa Prisma como ORM principal, tener tabla `profiles` permite joins naturales con obras, asignaciones, etc. Y `app_metadata` se puede mantener como copia del rol para JWT.

---

#### TASK-007: Definir modelo inicial de negocio MYC en Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma / Arquitectura
**Tamaño:** M
**Depende de:** TASK-005, TASK-006
**Objetivo:** Diseñar y documentar el esquema Prisma completo con todas las entidades MYC según LORE.md, sin implementarlo aún.
**Archivos sugeridos:** `prisma/schema.prisma`, `LORE.md`, `.agents/skills/myc-architecture/SKILL.md`
**Pasos:**
1. Leer LORE.md secciones 5 a 10 (entidades, relaciones, reglas, flujos).
2. Listar todas las entidades: Usuario (o Profile), Cliente, Obra, AsignacionObra, ActualizacionObra, ArchivoActualizacion, ArchivoObra, HistorialEstadoObra, ComentarioActualizacion, ComentarioObra.
3. Definir campos, tipos, relaciones y enum para cada entidad según LORE.md.
4. Documentar el diseño en myc-architecture SKILL.md.
**Criterios de aceptación:**
- Diseño documentado con todas las entidades, campos y relaciones de LORE.md.
- Listo para implementar como tarea separada.
**Validación:** Revisión del diseño documentado.
**Notas:** No implementar aún. Solo diseño y documentación.

---

#### TASK-008: Implementar modelo `profiles` en Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma
**Tamaño:** S
**Depende de:** TASK-006, TASK-007
**Objetivo:** Crear el modelo `Profile` en `schema.prisma` con campos: id (UUID, FK a `auth.users`), nombre, email, rol, activo, creado_en, actualizado_en.
**Archivos sugeridos:** `prisma/schema.prisma`
**Pasos:**
1. Abrir `prisma/schema.prisma`.
2. Agregar modelo `Profile` con los campos definidos.
3. Configurar `id` como `String @id` (UUID de Supabase Auth).
4. Ejecutar `npx prisma validate`.
5. Ejecutar `npm run db:generate`.
**Criterios de aceptación:**
- `npx prisma validate` pasa.
- `npm run db:generate` genera tipos para `Profile`.
- `npm run build` compila sin errores.
**Validación:** `npx prisma validate && npm run db:generate && npm run build`.
**Notas:** El modelo `Profile` debe usar `@id` con `String` porque `auth.users.id` es UUID textual. No crear migración aún (se crea cuando se agreguen todos los modelos juntos).

---

#### TASK-009: Crear migración inicial de Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma / Supabase
**Tamaño:** S
**Depende de:** TASK-008, TASK-007 (al menos modelo Profile + un modelo de negocio)
**Objetivo:** Ejecutar `prisma migrate dev` para crear la migración inicial que refleje los modelos Prisma en la base de datos PostgreSQL de Supabase.
**Archivos sugeridos:** `prisma/migrations/`, `prisma/schema.prisma`
**Pasos:**
1. Confirmar que `DATABASE_URL` y `DIRECT_DATABASE_URL` están configuradas en `.env.local`.
2. Ejecutar `npx prisma migrate dev --name init`.
3. Verificar que las tablas se crearon en Supabase.
**Criterios de aceptación:**
- Migración creada en `prisma/migrations/`.
- `npx prisma migrate status` muestra "Database up to date".
**Validación:** `npx prisma migrate status`.
**Notas:** Usar `DIRECT_DATABASE_URL` para migraciones. Esperar a tener al menos el modelo Profile listo. Bloqueado si no hay modelos implementados.

---

#### TASK-010: Sincronizar seed admin con modelo Profile

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Auth / Prisma
**Tamaño:** S
**Depende de:** TASK-008, TASK-005
**Objetivo:** Actualizar `scripts/seed-admin.mjs` para que después de crear/actualizar el usuario en Supabase Auth, también cree/actualice su registro en la tabla `profiles` mediante Prisma.
**Archivos sugeridos:** `scripts/seed-admin.mjs`, `prisma/schema.prisma`
**Pasos:**
1. Importar Prisma Client en el seed.
2. Después de `supabase.auth.admin.createUser`, insertar registro en `Profile`.
3. En `ensureAdminRole`, también actualizar `Profile`.
4. Ejecutar `npm run seed:admin` para probar (requiere env vars configuradas).
**Criterios de aceptación:**
- Seed crea usuario en Supabase Auth y registro en `profiles`.
- Seed es idempotente: si el usuario existe, actualiza ambos.
**Validación:** Ejecutar `npm run seed:admin` con env vars configuradas y verificar registro en `profiles`.
**Notas:** El seed debe usar Prisma Client para escribir en `profiles`. Asegurar que la conexión a DB está configurada.

---

#### TASK-011: Implementar creación automática de perfil al registrar usuario

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Auth / Prisma
**Tamaño:** S
**Depende de:** TASK-008, TASK-005
**Objetivo:** En el flujo de registro (`signUpWithPassword` en login/actions.ts), crear automáticamente un registro en `profiles` después de que Supabase Auth confirma el registro.
**Archivos sugeridos:** `src/app/auth/login/actions.ts`, `src/lib/supabase/server.ts`, `prisma/schema.prisma`
**Pasos:**
1. En `signUpWithPassword`, después de `supabase.auth.signUp()`, si hay `data.user`, crear `Profile` via Prisma.
2. Usar el `user.id` de Supabase como `id` del Profile.
3. Extraer email del formulario (ya disponible).
4. Asignar rol por defecto según definición de TASK-005 (ej: "cliente").
**Criterios de aceptación:**
- Al registrarse un usuario nuevo, se crea su registro en `profiles`.
- `npm run build` compila sin errores.
**Validación:** Registrarse y verificar en tabla `profiles`.
**Notas:** El rol por defecto depende de la decisión de TASK-005. Si el registro requiere confirmación de email, esperar a que Supabase confirme antes de crear el perfil; o usar trigger de Supabase (opción más avanzada).

---

### Fase 2 — Dashboard Y Navegación

---

#### TASK-012: Crear layout autenticado y navegación básica

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** UI / Dashboard
**Tamaño:** M
**Depende de:** Ninguna (no necesita modelos de negocio)
**Objetivo:** Crear un layout compartido para rutas autenticadas con header, usuario actual, y navegación a los módulos futuros del dashboard.
**Archivos sugeridos:** `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/obras/page.tsx`, `src/app/(dashboard)/clientes/page.tsx`
**Pasos:**
1. Crear ruta `src/app/(dashboard)/` con layout protegido.
2. Layout: header con nombre de usuario, botón de logout, navegación placeholder.
3. Redirigir a `/` si no hay sesión (similar a `/protected`).
4. Crear páginas vacías para los módulos: obras, clientes, usuarios, archivos.
5. Cada página muestra título del módulo y mensaje "Próximamente".
**Criterios de aceptación:**
- Al iniciar sesión, redirige a `/dashboard`.
- El layout muestra nombre de usuario y logout.
- Las páginas de módulos existen y son accesibles desde la navegación.
- `npm run build` compila sin errores.
**Validación:** Iniciar sesión, navegar a `/dashboard` y a cada submódulo.
**Notas:** Usar grupo de rutas `(dashboard)` para compartir layout sin afectar la ruta `/`. La página home (`/`) debe redirigir al dashboard si hay sesión activa, o seguir mostrando login si no.

---

#### TASK-013: Redirigir a dashboard post-login

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Auth / UI
**Tamaño:** XS
**Depende de:** TASK-012
**Objetivo:** Cambiar las redirecciones post-login de `/protected` a `/dashboard`.
**Archivos sugeridos:** `src/app/auth/login/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/page.tsx`
**Pasos:**
1. En `signInWithPassword`: cambiar redirect a `/dashboard`.
2. En `signUpWithPassword`: cambiar redirect a `/dashboard` (o mantener `/protected` como fallback).
3. En `auth/callback/route.ts`: cambiar `next` por defecto de `/protected` a `/dashboard`.
4. En `page.tsx`: el link "Ir a zona protegida" debe apuntar a `/dashboard`.
**Criterios de aceptación:**
- Login con email/password redirige a `/dashboard`.
- Login con Google redirige a `/dashboard`.
- Registro con sesión inmediata redirige a `/dashboard`.
**Validación:** Probar cada flujo de login.
**Notas:** Mantener `/protected` como ruta existente por ahora; se puede deprecar después.

---

#### TASK-014: Agregar indicador de sesión en página principal

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** UI / Auth
**Tamaño:** XS
**Depende de:** TASK-012
**Objetivo:** En la página home (`/`), cuando hay sesión activa, mostrar un enlace directo al dashboard en lugar de (o además de) la zona protegida.
**Archivos sugeridos:** `src/app/page.tsx`
**Pasos:**
1. Localizar el bloque de sesión activa en `page.tsx`.
2. Agregar enlace a `/dashboard` junto al existente de `/protected`.
3. Mantener ambos enlaces durante transición.
**Criterios de aceptación:**
- Usuario autenticado ve enlace a `/dashboard`.
**Validación:** Iniciar sesión, ver enlace a dashboard.
**Notas:** Tarea pequeña, opcional si TASK-013 ya redirige automáticamente.

---

#### TASK-015: Agregar manejo de errores y loading states en auth

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** UI / Auth
**Tamaño:** S
**Depende de:** Ninguna
**Objetivo:** Mejorar la experiencia de usuario en los formularios de auth con estados de carga, deshabilitar botones durante submit, y mejor manejo de errores de red.
**Archivos sugeridos:** `src/app/page.tsx`
**Pasos:**
1. Identificar formularios de login y registro en `page.tsx`.
2. Agregar atributo `aria-busy` o disabled a botones durante submit (requiere `use client` o pasar estado desde server action).
3. Evaluar si conviene convertir los formularios a Client Components para mejor feedback.
4. Si se decide convertir, crear un componente `AuthForm` client.
**Criterios de aceptación:**
- Botones se deshabilitan durante submit.
- Feedback visual de carga (opcional pero deseable).
- `npm run build` compila.
**Validación:** Submit rápido repetido no debe enviar múltiples requests.
**Notas:** Los server actions actuales redirigen inmediatamente, por lo que el loading es breve. Evaluar si realmente se necesita.

---

### Fase 3 — Modelos De Negocio (Prisma)

---

#### TASK-016: Implementar modelo `Cliente` en Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma
**Tamaño:** S
**Depende de:** TASK-007 (diseño completo)
**Objetivo:** Crear modelo `Cliente` en `schema.prisma` según LORE.md sección 5: id, tipo_cliente, nombre_mostrar, teléfono, documento, dirección, profile_id (FK a Profile), creado_por (FK a Profile), eliminado_en, creado_en, actualizado_en.
**Archivos sugeridos:** `prisma/schema.prisma`
**Pasos:**
1. Abrir `prisma/schema.prisma`.
2. Agregar modelo `Cliente` con campos definidos.
3. Definir enum `TipoCliente` con valores `persona`, `empresa`.
4. Definir relaciones con `Profile`.
5. Ejecutar `npx prisma validate`.
**Criterios de aceptación:**
- `npx prisma validate` pasa.
- Modelo incluye todos los campos de LORE.md.
**Validación:** `npx prisma validate`.
**Notas:** No crear migración aún. Se migrará cuando todos los modelos estén listos.

---

#### TASK-017: Implementar modelo `Obra` en Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma
**Tamaño:** S
**Depende de:** TASK-016 (Obra tiene FK a Cliente)
**Objetivo:** Crear modelo `Obra` en `schema.prisma` según LORE.md: id, cliente_id, nombre, descripcion, estado_actual, progreso_actual, fecha_inicio, fecha_fin_estimada, archivada_en, creado_por, actualizado_por, eliminado_en, creado_en, actualizado_en.
**Archivos sugeridos:** `prisma/schema.prisma`
**Pasos:**
1. Agregar modelo `Obra` con campos.
2. Definir enum `EstadoObra` con valores: `planeacion`, `en_progreso`, `en_pausa`, `completado`, `cancelado`.
3. Definir FK a `Cliente` y a `Profile` (creado_por, actualizado_por).
4. Ejecutar `npx prisma validate`.
**Criterios de aceptación:**
- `npx prisma validate` pasa.
- Relaciones con Cliente y Profile correctas.
**Validación:** `npx prisma validate`.
**Notas:** El campo `archivada_en` es opcional (nullable).

---

#### TASK-018: Implementar modelos restantes MYC en Prisma

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma
**Tamaño:** M
**Depende de:** TASK-017
**Objetivo:** Crear los modelos restantes: AsignacionObra, ActualizacionObra, ArchivoActualizacion, ArchivoObra, HistorialEstadoObra, ComentarioActualizacion, ComentarioObra, con sus enums y relaciones según LORE.md.
**Archivos sugeridos:** `prisma/schema.prisma`
**Pasos:**
1. Agregar modelo `AsignacionObra` con enum `RolAsignacion` (`ingeniero`, `marketing`).
2. Agregar modelo `ActualizacionObra` con FK a Obra y Profile.
3. Agregar modelo `ArchivoActualizacion` con enum `TipoArchivoActualizacion` (`foto`, `video`).
4. Agregar modelo `ArchivoObra` con enum `TipoArchivoObra` (`foto`, `documento`, `pdf`, `otro`).
5. Agregar modelo `HistorialEstadoObra` con FK a Obra, Profile y opcional a ActualizacionObra.
6. Agregar modelo `ComentarioActualizacion`.
7. Agregar modelo `ComentarioObra`.
8. Ejecutar `npx prisma validate`.
**Criterios de aceptación:**
- `npx prisma validate` pasa.
- Todos los modelos de LORE.md están presentes.
- Las relaciones coinciden con el diagrama ER de LORE.md.
**Validación:** `npx prisma validate`.
**Notas:** No crear migración aún.

---

#### TASK-019: Crear migración completa de modelos MYC

**Estado:** [ ] Pendiente
**Prioridad:** P0
**Área:** Prisma / Supabase
**Tamaño:** M
**Depende de:** TASK-018 (todos los modelos implementados)
**Objetivo:** Ejecutar `prisma migrate dev` para crear la migración con todos los modelos MYC y aplicarla a la base de datos Supabase.
**Archivos sugeridos:** `prisma/migrations/`, `prisma/schema.prisma`
**Pasos:**
1. Confirmar `DIRECT_DATABASE_URL` configurada.
2. Ejecutar `npx prisma migrate dev --name add-myc-models`.
3. Verificar tablas creadas en Supabase.
4. Ejecutar `npm run build` para confirmar que los tipos generados son compatibles.
**Criterios de aceptación:**
- Migración creada en `prisma/migrations/`.
- `npx prisma migrate status` muestra "Database up to date".
- `npm run build` compila.
**Validación:** `npx prisma migrate status && npm run build`.
**Notas:** Esta tarea modifica la base de datos. Hacer backup si es necesario. Usar conexión directa (DIRECT_DATABASE_URL).

---

### Fase 4 — Autorización Y Seguridad

---

#### TASK-020: Definir políticas RLS para Supabase

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Supabase / Seguridad
**Tamaño:** M
**Depende de:** TASK-019 (modelos migrados)
**Objetivo:** Diseñar y documentar las políticas RLS necesarias para cada tabla MYC, alineadas con las reglas de negocio de LORE.md (roles, asignación por obra, autoría, super_admin total).
**Archivos sugeridos:** `.agents/skills/supabase/SKILL.md`, `LORE.md`, script SQL para RLS
**Pasos:**
1. Leer reglas de negocio en LORE.md secciones 3-6.
2. Para cada tabla, definir: quién puede SELECT, INSERT, UPDATE, DELETE.
3. Documentar políticas en myc-architecture SKILL.md.
4. Crear script SQL con `CREATE POLICY` para cada tabla.
5. Ejecutar script en Supabase (usando migración Prisma o SQL directo).
**Criterios de aceptación:**
- Cada tabla tiene políticas RLS que reflejan las reglas de LORE.md.
- `super_admin` puede todo.
- Usuario solo ve/edita lo que le corresponde por rol y asignación.
- Cliente solo ve sus propias obras.
**Validación:** Consultar tablas con diferentes roles de usuario.
**Notas:** Consultar `.agents/skills/supabase-postgres-best-practices/SKILL.md` para optimización de RLS. Recordar: `auth.role()` está deprecado; usar `TO authenticated`.

---

#### TASK-021: Agregar validación de sesión en todas las rutas del dashboard

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Auth / UI
**Tamaño:** S
**Depende de:** TASK-012
**Objetivo:** Asegurar que todas las rutas dentro del dashboard verifiquen sesión activa en el servidor, redirigiendo a `/` si no hay sesión válida.
**Archivos sugeridos:** `src/app/(dashboard)/layout.tsx`
**Pasos:**
1. En el layout del dashboard, llamar `createClient()` + `getClaims()`.
2. Si no hay claims válidos, redirigir a `/`.
3. Si hay sesión, pasar datos del usuario al layout (nombre, email, rol).
**Criterios de aceptación:**
- Sin sesión, cualquier ruta `/dashboard/*` redirige a `/`.
- Layout recibe datos del usuario autenticado.
**Validación:** Cerrar sesión e intentar navegar a `/dashboard/*`.
**Notas:** Usar el mismo patrón que `protected/page.tsx`.

---

#### TASK-022: Planificar Storage para archivos de obras

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** Supabase / Storage
**Tamaño:** S
**Depende de:** Ninguna (puede hacerse en paralelo)
**Objetivo:** Diseñar y documentar la estrategia de Storage de Supabase para archivos de obra (fotos, videos, PDFs, documentos), incluyendo buckets, carpetas, políticas de acceso y límites.
**Archivos sugeridos:** `LORE.md`, `.agents/skills/supabase/SKILL.md`, notas de diseño
**Pasos:**
1. Leer LORE.md sección 5 (ArchivoActualizacion, ArchivoObra).
2. Diseñar estructura de buckets: `obra-files` con subcarpetas por `obra_id`.
3. Definir políticas de acceso: admin/ingeniero/marketing pueden subir; cliente solo lectura.
4. Definir límites de tamaño y formatos permitidos.
5. Documentar en myc-architecture SKILL.md.
**Criterios de aceptación:**
- Estrategia documentada con buckets, carpetas y políticas.
- Listo para implementar cuando se necesite.
**Validación:** Revisión del documento.
**Notas:** No implementar aún. Solo diseño. La implementación requiere RLS en Storage.

---

### Fase 5 — UI De Gestión

---

#### TASK-023: Crear página de listado de clientes (vacia con placeholder)

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** UI / Dashboard
**Tamaño:** S
**Depende de:** TASK-012, TASK-016
**Objetivo:** Crear la página `/dashboard/clientes` con layout funcional: título, botón de "Nuevo cliente", mensaje "Próximamente" si no hay datos.
**Archivos sugeridos:** `src/app/(dashboard)/clientes/page.tsx`
**Pasos:**
1. Crear ruta `src/app/(dashboard)/clientes/page.tsx`.
2. Agregar título "Clientes" y subtítulo.
3. Botón "Nuevo cliente" (sin funcionalidad aún).
4. Mostrar tabla vacía o mensaje "No hay clientes registrados".
**Criterios de aceptación:**
- Ruta `/dashboard/clientes` accesible desde navegación del dashboard.
- UI lista para recibir datos reales.
**Validación:** Navegar a `/dashboard/clientes`.
**Notas:** No conectar a base de datos aún. Primero estructura UI.

---

#### TASK-024: Crear página de listado de obras (placeholder)

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** UI / Dashboard
**Tamaño:** S
**Depende de:** TASK-012, TASK-017
**Objetivo:** Crear la página `/dashboard/obras` con estructura similar a clientes.
**Archivos sugeridos:** `src/app/(dashboard)/obras/page.tsx`
**Pasos:**
1. Crear ruta `src/app/(dashboard)/obras/page.tsx`.
2. Título "Obras" con subtítulo.
3. Botón "Nueva obra".
4. Mensaje de estado vacío.
**Criterios de aceptación:**
- Ruta `/dashboard/obras` accesible.
**Validación:** Navegar a `/dashboard/obras`.

---

#### TASK-025: Crear página de listado de usuarios

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** UI / Dashboard
**Tamaño:** S
**Depende de:** TASK-012, TASK-005
**Objetivo:** Crear página `/dashboard/usuarios` para administración de usuarios del sistema.
**Archivos sugeridos:** `src/app/(dashboard)/usuarios/page.tsx`
**Pasos:**
1. Crear ruta `src/app/(dashboard)/usuarios/page.tsx`.
2. Título "Usuarios" con subtítulo.
3. Botón "Nuevo usuario".
4. Mensaje de estado vacío.
**Criterios de aceptación:**
- Ruta accesible desde navegación.
**Validación:** Navegar a `/dashboard/usuarios`.

---

#### TASK-026: Crear componente de navegación lateral o header

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** UI / Dashboard
**Tamaño:** S
**Depende de:** TASK-012
**Objetivo:** Extraer la navegación del dashboard a un componente reutilizable con links a cada módulo, nombre de usuario y logout.
**Archivos sugeridos:** `src/app/(dashboard)/_components/Sidebar.tsx` o `src/app/(dashboard)/_components/Header.tsx`
**Pasos:**
1. Crear carpeta `src/app/(dashboard)/_components/`.
2. Crear componente `DashboardHeader.tsx` con logo, nav links, usuario y logout.
3. Integrar en layout del dashboard.
**Criterios de aceptación:**
- Navegación muestra todos los módulos disponibles.
- Logout funciona.
- Nombre de usuario se muestra.
**Validación:** Navegar entre módulos desde el header.
**Notas:** Usar Server Component. El logout es server action.

---

### Fase 6 — Documentación Y Pruebas

---

#### TASK-027: Crear guía de desarrollo en README.md

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** Documentación
**Tamaño:** S
**Depende de:** Ninguna
**Objetivo:** Agregar sección en README.md con guía para desarrolladores: cómo agregar un modelo Prisma, cómo crear una migración, cómo agregar una ruta, cómo agregar un server action, cómo probar auth localmente.
**Archivos sugeridos:** `README.md`
**Pasos:**
1. Agregar sección "Guía de desarrollo".
2. Incluir: cómo agregar modelo Prisma, migrar, generar cliente.
3. Incluir: cómo agregar ruta protegida.
4. Incluir: cómo probar auth localmente.
**Criterios de aceptación:**
- README.md cubre el flujo de desarrollo básico.
**Validación:** Lectura del README actualizado.

---

#### TASK-028: Crear checklist manual de QA

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** Testing
**Tamaño:** S
**Depende de:** Ninguna
**Objetivo:** Crear archivo `QA-CHECKLIST.md` con casos de prueba manuales para cada funcionalidad implementada.
**Archivos sugeridos:** `QA-CHECKLIST.md`
**Pasos:**
1. Crear archivo en la raíz.
2. Agrupar por área: Auth, Clientes, Obras, Dashboard.
3. Para Auth: login Google, login email, registro, logout, ruta protegida, seed admin.
4. Para cada caso: prerequisitos, pasos, resultado esperado.
**Criterios de aceptación:**
- Checklist cubre todas las funcionalidades implementadas y planificadas.
**Validación:** Revisión del checklist.
**Notas:** QA manual hasta que se decida framework de testing automatizado.

---

#### TASK-029: Agregar framework de testing (Vitest)

**Estado:** [ ] Pendiente
**Prioridad:** P3
**Área:** Testing
**Tamaño:** M
**Depende de:** Ninguna
**Objetivo:** Instalar y configurar Vitest + Testing Library para tests unitarios de server actions y componentes.
**Archivos sugeridos:** `vitest.config.ts`, `package.json`, `src/app/auth/login/actions.test.ts`
**Pasos:**
1. Instalar `vitest`, `@testing-library/react`, `@testing-library/jest-dom`.
2. Configurar `vitest.config.ts` con path alias `@/`.
3. Crear test simple para una server action (ej: `getPasswordCredentials`).
4. Agregar script `"test": "vitest run"` en `package.json`.
5. Ejecutar y verificar que pasa.
**Criterios de aceptación:**
- `npm test` ejecuta tests y pasa.
**Validación:** `npm test`.
**Notas:** Tarea P3, priorizar otras tareas primero.

---

### Fase 7 — Calidad Y Seguridad

---

#### TASK-030: Revisar seguridad de variables de entorno

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Seguridad
**Tamaño:** XS
**Depende de:** Ninguna
**Objetivo:** Verificar que ninguna variable de entorno sensible (SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, ADMIN_PASSWORD) se use en cliente o se exponga en logs.
**Archivos sugeridos:** `src/lib/supapen/env.ts`, `src/lib/supabase/client.ts`, `src/proxy.ts`, todos los server actions
**Pasos:**
1. Buscar `process.env.SUPABASE_SERVICE_ROLE_KEY` en archivos `src/`.
2. Confirmar que solo aparece en `scripts/seed-admin.mjs` (archivo servidor).
3. Verificar que ningún componente cliente importa variables con prefijo sin `NEXT_PUBLIC_`.
4. Verificar que `DATABASE_URL` y `DIRECT_DATABASE_URL` solo se usan en `prisma.config.ts`.
**Criterios de aceptación:**
- Sin fugas de secretos identificadas.
**Validación:** `rg "SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL" src/`.
**Notas:** Si se encuentra fuga, crear tarea correctiva urgente P0.

---

#### TASK-031: Agregar validación de origen en callback OAuth

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** Seguridad / Auth
**Tamaño:** XS
**Depende de:** Ninguna
**Objetivo:** Validar que el `state` devuelto por Google OAuth en el callback coincida con el generado, para prevenir CSRF en el flujo OAuth.
**Archivos sugeridos:** `src/app/auth/callback/route.ts`
**Pasos:**
1. Investigar si `@supabase/ssr` maneja automáticamente la validación de `state`.
2. Si no lo hace, leer `next/headers` para obtener y verificar el `state`.
3. Si el `state` no coincide, redirigir con error.
**Criterios de aceptación:**
- El callback OAuth verifica el `state` o se confirma que Supabase lo maneja.
**Validación:** Revisión del código y documentación de Supabase.
**Notas:** Supabase maneja el `state` internamente en `exchangeCodeForSession`. Confirmar en docs.

---

#### TASK-032: Agregar rate limiting en login

**Estado:** [ ] Pendiente
**Prioridad:** P3
**Área:** Seguridad
**Tamaño:** M
**Depende de:** Ninguna
**Objetivo:** Implementar rate limiting en los endpoints de login para prevenir ataques de fuerza bruta.
**Archivos sugeridos:** `src/app/auth/login/actions.ts`, `src/proxy.ts`
**Pasos:**
1. Evaluar opciones: middleware de rate limiting, Supabase RLS con `auth.users`, o solución externa.
2. Implementar la opción elegida (ej: contar intentos por IP en los últimos 5 minutos).
3. Bloquear temporalmente después de N intentos fallidos.
**Criterios de aceptación:**
- Intentos de login fallidos consecutivos son limitados.
**Validación:** Intentar login con 5+ contraseñas incorrectas.
**Notas:** Depende de infraestructura de deploy. Puede implementarse como edge function o middleware.

---

### Fase 8 — Deploy Y CI/CD

---

#### TASK-033: Configurar deploy en Vercel

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** Deploy
**Tamaño:** M
**Depende de:** TASK-019 (migraciones aplicadas)
**Objetivo:** Conectar repositorio a Vercel, configurar variables de entorno, y lograr un deploy exitoso del proyecto.
**Archivos sugeridos:** `vercel.json` (opcional), Vercel Dashboard
**Pasos:**
1. Ir a Vercel Dashboard → Import project → conectar repositorio.
2. Configurar Framework Preset: Next.js.
3. Agregar todas las variables de entorno en Vercel (sin `NEXT_PUBLIC_` para secretos).
4. Desplegar y verificar build exitoso.
5. Verificar auth funciona en producción.
**Criterios de aceptación:**
- Deploy exitoso en Vercel.
- Auth funciona (login, registro, logout) en URL de producción.
**Validación:** `npm run build` en Vercel, probar URL de producción.
**Notas:** Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` deben apuntar al proyecto Supabase de producción. Configurar dominio personalizado si aplica.

---

#### TASK-034: Configurar CI básico con GitHub Actions

**Estado:** [ ] Pendiente
**Prioridad:** P3
**Área:** Deploy
**Tamaño:** S
**Depende de:** Ninguna
**Objetivo:** Crear workflow de GitHub Actions que ejecute `lint`, `build` y `test` en cada push.
**Archivos sugeridos:** `.github/workflows/ci.yml`
**Pasos:**
1. Crear carpeta `.github/workflows/`.
2. Crear `ci.yml` con jobs: lint, build, test.
3. Verificar que el workflow corre en push y PRs.
**Criterios de aceptación:**
- Workflow se ejecuta en cada push.
- Todos los jobs pasan.
**Validación:** Push a cualquier rama y verificar Actions en GitHub.
**Notas:** No debe incluir secretos. Las variables de entorno para CI deben configurarse en GitHub Secrets.

---

### Fase 9 — Refinamiento Y Mejoras

---

#### TASK-035: Agregar filtro de autorización por obra asignada

**Estado:** [ ] Pendiente
**Prioridad:** P1
**Área:** Auth / Seguridad
**Tamaño:** L
**Depende de:** TASK-019 (modelos migrados), TASK-020 (RLS documentado)
**Objetivo:** Implementar validación en server actions y rutas para que ingeniero/marketing solo accedan a obras a las que están asignados, según reglas de LORE.md.
**Archivos sugeridos:** `src/lib/authorization/`, server actions de obras
**Pasos:**
1. Crear helper `canAccessObra(profileId, obraId)` que consulta `AsignacionObra`.
2. Crear helper `canEditUpdate(profileId, actualizacionId)`.
3. Integrar en server actions de obras y actualizaciones.
4. Crear tarea para testear cada helper.
**Criterios de aceptación:**
- Perfil sin asignación a obra recibe error 403 al intentar acceder.
- `super_admin` puede acceder a cualquier obra.
**Validación:** Probar con diferentes roles.
**Notas:** Tarea grande. Dividir si es necesario: (a) helpers, (b) integración en obras, (c) integración en actualizaciones, (d) tests.

---

#### TASK-036: Agregar manejo de errores global con Error Boundary

**Estado:** [ ] Pendiente
**Prioridad:** P2
**Área:** UI
**Tamaño:** S
**Depende de:** Ninguna
**Objetivo:** Crear un `error.tsx` y `global-error.tsx` en App Router para capturar errores no esperados y mostrar una UI amigable.
**Archivos sugeridos:** `src/app/error.tsx`, `src/app/global-error.tsx`
**Pasos:**
1. Crear `src/app/error.tsx` con componente de error (mensaje, botón reintentar).
2. Crear `src/app/global-error.tsx` para errores del layout raíz.
3. Verificar que se renderizan correctamente forzando un error.
**Criterios de aceptación:**
- Error inesperado muestra UI amigable en lugar de pantalla blanca.
- Botón de reintentar funciona.
**Validación:** Forzar error en una página y verificar.
**Notas:** Next.js App Router requiere `'use client'` en error.tsx.

---

#### TASK-037: Agregar skeletons y loading states

**Estado:** [ ] Pendiente
**Prioridad:** P3
**Área:** UI
**Tamaño:** S
**Depende de:** TASK-012
**Objetivo:** Crear componentes `loading.tsx` para cada ruta del dashboard que muestre un skeleton mientras carga.
**Archivos sugeridos:** `src/app/(dashboard)/loading.tsx`, `src/app/(dashboard)/clientes/loading.tsx`, etc.
**Pasos:**
1. Crear `loading.tsx` en la raíz del dashboard.
2. Crear loading para cada submódulo.
3. Usar Tailwind para animación de skeleton.
**Criterios de aceptación:**
- Mientras una página carga, se muestra skeleton en lugar de blank.
**Validación:** Navegar a rutas con datos pesados.
**Notas:** Tarea de pulido, priorizar después de funcionalidad básica.

---

## Resumen De Tareas

| Rango | Cantidad |
|---|---|
| TASK-001 a TASK-037 | 37 tareas |
| P0 | 6 |
| P1 | 14 |
| P2 | 11 |
| P3 | 6 |

| Área | Cantidad |
|---|---|
| Documentación | 4 |
| Prisma | 7 |
| Arquitectura | 3 |
| Auth / Seguridad | 5 |
| UI / Dashboard | 8 |
| Supabase / Storage | 2 |
| Testing | 2 |
| Deploy | 2 |
| Configuración | 1 |
| Calidad | 3 |

---

## Bloqueos y Decisiones Pendientes

1. **Mapeo de roles Supabase Auth → MYC** (TASK-005): El seed usa `role: "admin"` pero LORE.md define `super_admin`, `ingeniero`, `marketing`, `cliente`. Decidir si "admin" = "super_admin" o si se mapea diferente. Bloquea TASK-006, TASK-008, TASK-010, TASK-011.
2. **Tabla profiles vs app_metadata** (TASK-006): Decidir si los datos de perfil viven en Prisma o solo en Supabase Auth. Impacta todo el modelo de datos.
3. **Variables de entorno de base de datos**: `DATABASE_URL` y `DIRECT_DATABASE_URL` requieren valores reales de Supabase Dashboard, no disponibles via MCP. Bloquea migraciones.
4. **SUPABASE_SERVICE_ROLE_KEY**: No disponible via MCP. Requiere acceso manual a Supabase Dashboard. Bloquea seed admin.
5. **Google OAuth**: No configurable via MCP. Requiere configuración manual en Supabase Dashboard y Google Cloud Console.
