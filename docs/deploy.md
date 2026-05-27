# Checklist de despliegue MYC

## 1. Objetivo

Este documento es la guia paso a paso para desplegar MYC en un entorno de produccion (Vercel, Supabase Cloud). Cubre configuracion de variables de entorno, base de datos, Supabase Auth, RLS, Storage, Realtime, SQL manual, seed inicial y verificaciones post-deploy. Seguir esta checklist en orden evita omisiones criticas.

---

## 2. Estado esperado antes de desplegar

- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run test` pasa (40/40 tests)
- [ ] Migraciones de Prisma aplicadas en Supabase
- [ ] SQL manual (`prisma/sql/*.sql`) aplicado en Supabase
- [ ] Supabase Auth configurado (email/password, redirects)
- [ ] Variables de entorno definidas en el proveedor de hosting
- [ ] Usuario `super_admin` inicial creado
- [ ] RLS activo en las 10 tablas de `public`
- [ ] Storage bucket `myc-project-files` creado y privado
- [ ] Realtime activo con las 7 tablas en la publicacion

---

## 3. Variables de entorno requeridas

### Variables publicas (seguras para cliente)

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej. `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key de Supabase (formato `sb_publishable_...` o JWT `anon`) |

Estas variables son visibles en el bundle de cliente. Usar la publishable key, no la `service_role`.

### Variables privadas (solo servidor)

| Variable | Descripcion |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (solo backend). **Nunca exponer en cliente.** |
| `DATABASE_URL` | URL de conexion a PostgreSQL via Supavisor Session Pooler (formato `postgres://...`) |
| `DIRECT_URL` | URL de conexion directa a PostgreSQL (para migraciones de Prisma, sin pooler) |

### Advertencias

- **Nunca** incluir `SUPABASE_SERVICE_ROLE_KEY` en codigo cliente ni en `NEXT_PUBLIC_*`
- `.env` y `.env.local` estan en `.gitignore` (ya verificado: patron `.env*`)
- Configurar estas variables en el dashboard del proveedor de hosting (Vercel, Railway, etc.)
- `DATABASE_URL` debe usar el **Session Pooler** (puerto 5432, host `aws-1-us-west-2.pooler.supabase.com` o similar)
- `DIRECT_URL` debe usar la conexion **directa** (puerto 5432, host `db.xxxxx.supabase.co`) para migraciones

---

## 4. Comandos locales de verificacion

Ejecutar en orden antes de desplegar:

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma (necesario despues de cambiar schema)
npx prisma generate

# Validar schema de Prisma
npx prisma validate

# Verificar estado de migraciones
npx prisma migrate status

# Lint
npm run lint

# Tests
npm run test

# Build de produccion
npm run build
```

---

## 5. Base de datos y Prisma

### Aplicar migraciones

En produccion, aplicar migraciones pendientes **sin reset**:

```bash
npx prisma migrate deploy
```

Verificar con:

```bash
npx prisma migrate status
```

### Advertencias

- **Nunca** ejecutar `prisma migrate reset` en produccion (borra todos los datos)
- **Nunca** ejecutar `prisma db push` en produccion
- Si `DATABASE_URL` usa Session Pooler, Prisma Migrate puede fallar. Usar `DIRECT_URL` para migraciones:

```bash
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

### Seed

El seed (`prisma/seed.ts`) usa Supabase Admin API y Prisma. Requiere `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPABASE_URL`.

```bash
npm run db:seed
```

**Solo ejecutar una vez** para crear el usuario `super_admin` inicial y usuarios de prueba. En produccion real, ejecutar despues de verificar que no hay usuarios demo no deseados.

---

## 6. SQL manual requerido en Supabase

Los siguientes scripts en `prisma/sql/` deben aplicarse **en orden** desde Supabase SQL Editor.

### Orden de ejecucion

| # | Archivo | Proposito | Idempotente | Riesgo |
|---|---------|-----------|-------------|--------|
| 1 | `fk-usuarios-auth-users.sql` | FK de `public.usuarios.id` → `auth.users.id` | Si (verifica existencia) | Bajo |
| 2 | `sync-auth-users-profile.sql` | Trigger que crea perfil en `public.usuarios` al registrarse en Auth | Si (CREATE OR REPLACE + DROP TRIGGER IF EXISTS) | Medio: si el trigger no existe, los nuevos usuarios no tendran perfil |
| 3 | `enable-rls-policies.sql` | Activa RLS y crea 23 politicas SELECT + 5 helper functions | Si (DROP POLICY IF EXISTS + CREATE POLICY) | Alto: sin RLS, los datos quedan expuestos via Data API |
| 4 | `add-foreign-key-indexes.sql` | 20 indices compuestos y FK en 10 tablas | Si (CREATE INDEX IF NOT EXISTS) | Bajo: sin indices, queries lentas con volumen |
| 5 | `enable-realtime.sql` | Agrega 7 tablas a la publicacion `supabase_realtime` | Si (PostgreSQL ignora duplicados en publicaciones) | Bajo: sin publicacion, Realtime no funciona |
| 6 | `harden-auth-sync-function.sql` | Mueve `sync_auth_user_profile()` a `myc_internal`, revoca permisos publicos | Si (CREATE SCHEMA IF NOT EXISTS + CREATE OR REPLACE + DROP TRIGGER IF EXISTS) | Medio: sin este paso, la funcion queda expuesta via RPC |

### Como aplicar desde Supabase SQL Editor

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar el proyecto MYC
3. Ir a **SQL Editor** (menu izquierdo)
4. Pegar el contenido del archivo SQL
5. Ejecutar con `Run` (Ctrl+Enter)
6. Verificar que no haya errores en la consola de resultados

### Como aplicar desde Supabase CLI

Si usas Supabase CLI local:

```bash
supabase db push
```

O archivo por archivo:

```bash
supabase db query --file prisma/sql/fk-usuarios-auth-users.sql
```

---

## 7. Supabase Auth

### Checklist

- [ ] Auth provider **Email** habilitado en Authentication > Providers
- [ ] "Confirm email" configurado segun necesidad (MVP puede no requerirlo)
- [ ] URL del sitio configurada en Authentication > URL Configuration
- [ ] Redirect URLs configuradas (ej. `https://tu-dominio.com/**`)
- [ ] Leaked Password Protection activado (si el plan lo permite, Pro o superior)
- [ ] Security Advisors revisados (Authentication > Advisors)
- [ ] Funcion `sync_auth_user_profile()` existe en `myc_internal` (verificar en SQL Editor: `SELECT proname, pronamespace::regnamespace FROM pg_proc WHERE proname = 'sync_auth_user_profile'`)
- [ ] Trigger `tr_sync_auth_user_profile` activo en `auth.users` (verificar con `SELECT tgname FROM pg_trigger WHERE tgname = 'tr_sync_auth_user_profile'`)

### Verificar sincronizacion Auth → public

1. Registrar un nuevo usuario desde la app
2. Verificar que aparece en `public.usuarios` con rol `cliente`
3. Si no aparece, revisar el trigger y la funcion

---

## 8. Supabase Storage

### Checklist

- [ ] Bucket `myc-project-files` creado en Storage
- [ ] Bucket configurado como **privado** (no publico)
- [ ] Tipos MIME permitidos: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `application/pdf`
- [ ] Tamano maximo configurado: 10 MB general, 50 MB video
- [ ] Politicas de acceso via RLS aplicadas (si las hay)
- [ ] Signed URLs funcionando (generar una URL firmada y verificar que expira en 300s)

### Crear bucket (si no existe)

Desde SQL Editor de Supabase:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'myc-project-files',
  'myc-project-files',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

---

## 9. Supabase Realtime

### Checklist

- [ ] Tablas agregadas a publicacion `supabase_realtime` (aplicar `enable-realtime.sql`)
- [ ] Verificar que las 7 tablas estan en la publicacion:
  ```sql
  SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  ```
- [ ] Listener `ProjectRealtimeListener` funcionando en `/dashboard/projects/[projectId]`
- [ ] Listener funcionando en `/dashboard/client`
- [ ] Cambios de comentarios refrescan la vista automaticamente (debounce 2s)
- [ ] Cambios de archivos refrescan la vista
- [ ] Cambios de actualizaciones refrescan la vista

Tablas esperadas en Realtime:
- `obras`
- `actualizaciones_obra`
- `comentarios_obra`
- `comentarios_actualizacion`
- `archivos_obra`
- `archivos_actualizacion`
- `historial_estado_obra`

---

## 10. Seguridad

### Checklist

- [ ] RLS activo en las 10 tablas de `public` (verificar con `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`)
- [ ] 23 politicas SELECT aplicadas (`enable-rls-policies.sql`)
- [ ] Sin politicas `TO anon` que expongan datos sin autenticacion
- [ ] `anon` y `authenticated` sin permisos `EXECUTE` sobre `sync_auth_user_profile`
- [ ] Funcion `sync_auth_user_profile()` en schema `myc_internal` (no en `public`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no expuesta en cliente
- [ ] `.env` y `.env.local` en `.gitignore`
- [ ] No hay secretos en el repositorio (verificar con `git log --all --full-history -- '*.env'`)
- [ ] Security Advisors revisados en Supabase Dashboard

### Verificar politicas RLS

```sql
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 11. Usuario inicial y seed

### Crear primer super_admin

Si el trigger Auth esta funcionando, cualquier registro creara el perfil en `public.usuarios`. Para crear el primer `super_admin`:

**Opcion A — Supabase Dashboard:**
1. Ir a Authentication > Users
2. Click "Add user" > "Create new user"
3. Ingresar email y contrasena
4. Ir a SQL Editor y actualizar el rol:
   ```sql
   UPDATE public.usuarios SET rol = 'super_admin' WHERE email = 'admin@ejemplo.com';
   ```

**Opcion B — Seed script:**
```bash
npm run db:seed
```
Editar `prisma/seed.ts` para incluir solo el usuario `super_admin` deseado y eliminar los usuarios demo (`Ingeniero Test`, `Marketing Test`, `Cliente Test`) antes de ejecutar en produccion.

### Advertencias

- No ejecutar seed con usuarios demo en produccion
- Cambiar la contrasena por defecto `Test123456!` despues del seed
- Desactivar o eliminar credenciales de prueba antes de abrir acceso a usuarios reales

---

## 12. Checklist post-deploy

Ejecutar estas pruebas manuales despues del despliegue:

### Autenticacion
- [ ] Registro de nuevo usuario funciona
- [ ] Login con credenciales validas funciona
- [ ] Login con credenciales invalidas muestra error
- [ ] Logout funciona y redirige a `/login`

### Roles y dashboards
- [ ] `super_admin` ve `/dashboard/admin`
- [ ] `ingeniero` ve `/dashboard/engineer`
- [ ] `marketing` ve `/dashboard/marketing`
- [ ] `cliente` ve `/dashboard/client`

### Flujo completo
- [ ] `super_admin` crea un cliente (persona o empresa)
- [ ] `super_admin` crea una obra asociada al cliente
- [ ] `super_admin` asigna un ingeniero a la obra (como principal)
- [ ] `super_admin` asigna un usuario de marketing a la obra
- [ ] `ingeniero` asignado ve la obra en su dashboard
- [ ] `ingeniero` crea una actualizacion con titulo y descripcion
- [ ] `ingeniero` sube una foto a la actualizacion
- [ ] `ingeniero` sube un archivo general a la obra
- [ ] `cliente` ve la obra y la actualizacion en su dashboard
- [ ] `cliente` comenta en la actualizacion
- [ ] `cliente` comenta en la obra (comentario general)
- [ ] `ingeniero` edita su propio comentario inline
- [ ] `ingeniero` elimina su propio comentario

### Archivos y Storage
- [ ] Vista previa de imagen funciona (thumbnail inline)
- [ ] Enlace "Ver" abre archivo en pestana nueva
- [ ] Enlace "Ver" funciona para PDFs
- [ ] Archivos de actualizacion visibles para el cliente
- [ ] Cliente no ve botones de subir/eliminar archivos

### Realtime
- [ ] Staff crea comentario → cliente ve el cambio sin refrescar manualmente
- [ ] Staff sube archivo de actualizacion → cambio visible en la vista del cliente
- [ ] Staff crea actualizacion nueva → aparece en la vista de ambos

### Seguridad
- [ ] Usuario sin autenticacion no accede a `/dashboard/*`
- [ ] `ingeniero` no asignado no ve obras ajenas
- [ ] `cliente` no ve obras de otros clientes
- [ ] `cliente` no puede crear/editar obras
- [ ] `cliente` no puede cambiar estado/progreso

---

## 13. Errores comunes

| Error | Causa probable | Solucion |
|-------|---------------|----------|
| `No se encontro informacion de cliente` en `/dashboard/client` | El usuario `cliente` no tiene registro en la tabla `clientes` | Crear el cliente via `super_admin` o verificar el seed |
| "Trigger no funcionando" al registrar usuario | `sync-auth-users-profile.sql` no aplicado | Aplicar el SQL en Supabase SQL Editor |
| `auth_rls_initplan` warnings en Performance Advisors | `auth.uid()` usado directamente en politicas | Ya resuelto en `enable-rls-policies.sql` con `(SELECT auth.uid())` |
| `SECURITY DEFINER` warning en Security Advisors | Funcion en schema `public` sin endurecer | Ya resuelto: `harden-auth-sync-function.sql` mueve la funcion a `myc_internal` |
| Imagenes no cargan preview | Signed URL expirada (300s) o bucket no creado | Recargar pagina para generar nueva signed URL; verificar bucket en Storage |
| Realtime no actualiza vistas | Tablas no estan en la publicacion `supabase_realtime` | Aplicar `enable-realtime.sql` |
| `permission denied for schema public` | RLS bloqueando acceso a datos | Verificar politicas y helper functions; verificar que el usuario esta autenticado |
| `PrismaClientInitializationError` | `DATABASE_URL` mal configurado | Verificar Session Pooler vs conexion directa |
| Migracion de Prisma falla | `DATABASE_URL` usa pooler en lugar de conexion directa | Usar `DIRECT_URL` para migraciones |
| Archivos no se suben | Bucket `myc-project-files` no existe | Crear bucket en Supabase Storage |
| Servidor no inicia | `SUPABASE_SERVICE_ROLE_KEY` no definida | Configurar en variables de entorno del hosting |
| `server-only` error en build | `src/lib/prisma.ts` exporta `prisma` fuera de server context | Verificar que los componentes cliente no importan `prisma` directamente |

---

## 14. Orden recomendado de despliegue

1. **Configurar proyecto Supabase**
   - Crear proyecto en Supabase Cloud (o verificar proyecto existente)
   - Obtener URL, anon key, y service role key

2. **Configurar variables de entorno**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Session Pooler)
   - `DIRECT_URL` (conexion directa)

3. **Aplicar migraciones Prisma**
   ```bash
   DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
   ```

4. **Aplicar SQL manual (en orden)**
   - `fk-usuarios-auth-users.sql`
   - `sync-auth-users-profile.sql`
   - `enable-rls-policies.sql`
   - `add-foreign-key-indexes.sql`
   - `enable-realtime.sql`
   - `harden-auth-sync-function.sql`

5. **Crear bucket de Storage**
   - Bucket `myc-project-files` (privado)
   - Configurar MIME types y limites

6. **Configurar Supabase Auth**
   - Habilitar email/password
   - Configurar URLs y redirects
   - Activar Leaked Password Protection (si esta disponible)

7. **Crear usuario super_admin inicial**
   - Via Supabase Dashboard o `npm run db:seed` (editar seed primero)

8. **Verificar build local**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

9. **Desplegar la aplicacion**
   - Push a repositorio
   - Conectar con Vercel (o proveedor elegido)
   - Configurar variables de entorno en el hosting
   - Esperar deploy exitoso

10. **Ejecutar checklist post-deploy**
    - Seguir la seccion 12 paso a paso

---

## 15. Criterio de listo para produccion

El proyecto esta listo para produccion si:

- [ ] Build pasa sin errores
- [ ] Lint pasa sin errores (warnings preexistentes aceptables)
- [ ] Tests pasan (40/40)
- [ ] SQL manual aplicado en orden
- [ ] RLS activo y politicas verificadas
- [ ] Storage bucket creado y configurado
- [ ] Realtime funcionando
- [ ] Auth sincronizando usuarios correctamente
- [ ] Checklist post-deploy completado sin incidencias
- [ ] Security Advisors revisados y sin WARN criticos
- [ ] Variables de entorno configuradas sin secretos en repositorio
- [ ] Usuario `super_admin` inicial funcional
- [ ] Usuarios demo eliminados o desactivados
