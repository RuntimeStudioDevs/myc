# Especificación Completa de Vistas, Botones y Navegación — MYC

> Documento generado a partir del código real del proyecto. Cada botón, enlace, formulario y flujo está verificado contra los archivos fuente en `src/app/`.

---

## 1. Página de Inicio `/`

**Archivo:** `src/app/page.tsx`

| Elemento | Tipo | Destino / Acción | Visible para |
|---|---|---|---|
| Título "MYC" | Texto estático | — | Todos |
| **Iniciar sesion** | `<Link>` (botón negro) | `/login` | Todos |

**Flujo:** `/` → clic en "Iniciar sesion" → `/login`

---

## 2. Inicio de Sesión `/login`

**Archivo:** `src/app/(auth)/login/page.tsx`

### Elementos

| Elemento | Tipo | Destino / Acción | Notas |
|---|---|---|---|
| Título "MYC" | Texto | — | — |
| Subtítulo "Inicia sesion en tu cuenta" | Texto | — | — |
| Banner verde "Cuenta creada" | Condicional | — | Solo si `?registered=true` en URL |
| Banner rojo de error | Condicional | — | Si `?error=...` en URL |
| Campo **Email** | `<input type="email" required>` | — | `name="email"` |
| Campo **Contrasena** | `<input type="password" required>` | — | `name="password"` |
| Botón **Ingresar** | `<button type="submit">` negro | Server Action `signInAction` → `/dashboard` | — |
| **Inicio** | `<Link>` sutil gris subrayado | `/` | Abajo a la izquierda |
| **Registrate** | `<Link>` negro subrayado | `/register` | Abajo a la derecha |

### Comportamiento
- Si el usuario ya tiene sesión activa, redirige automáticamente a `/dashboard`.
- Errores de Supabase Auth aparecen como banner rojo.
- Registro exitoso muestra banner verde.

---

## 3. Registro `/register`

**Archivo:** `src/app/(auth)/register/page.tsx`

| Elemento | Tipo | Destino / Acción | Notas |
|---|---|---|---|
| Título "MYC" | Texto | — | — |
| Subtítulo "Crea tu cuenta" | Texto | — | — |
| Banner rojo de error | Condicional | — | Si `?error=...` en URL |
| Campo **Nombre** | `<input type="text" required>` | — | `name="name"` |
| Campo **Email** | `<input type="email" required>` | — | `name="email"` |
| Campo **Contrasena** | `<input type="password" required>` | — | `name="password"` |
| Botón **Crear cuenta** | `<button type="submit">` negro | Server Action `signUpAction` → `/login?registered=true` | — |
| **Inicio** | `<Link>` sutil gris subrayado | `/` | Abajo a la izquierda |
| **Inicia sesion** | `<Link>` negro subrayado | `/login` | Abajo a la derecha |

### Comportamiento
- Si el usuario ya tiene sesión, redirige a `/dashboard`.
- Tras registro exitoso, espera hasta 1.5s a que el trigger de BD cree el perfil de dominio.

---

## 4. Dashboard — Redirección por Rol `/dashboard`

**Archivo:** `src/app/dashboard/page.tsx`

No tiene vista propia. Es un hub que redirige según rol:

| Rol | Redirige a |
|---|---|
| `super_admin` | `/dashboard/admin` |
| `ingeniero` | `/dashboard/engineer` |
| `marketing` | `/dashboard/marketing` |
| `cliente` | `/dashboard/client` |
| Sin sesión | `/login` |
| Rol desconocido | `/login?error=unknown-role` |

---

## 5. Panel de Administración `/dashboard/admin`

**Archivo:** `src/app/dashboard/admin/page.tsx`

**Rol:** `super_admin` exclusivo.

### Elementos

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Título "Panel de administracion" | Texto | — |
| Subtítulo "Bienvenido, {nombre}" | Texto | — |
| **Cerrar sesion** | `<button>` con borde | Server Action `signOutAction` → `/login` |
| Card Email | Texto informativo | Muestra `authUser.email` |
| Card Rol | Texto informativo | Muestra `profile.role` |
| **Card Usuarios** | Estadística | Total + activos (no clickeable) |
| **Card Clientes** | Estadística | Total + activos (no clickeable) |
| **Card Obras** | Estadística | Activas + finalizadas (no clickeable) |
| **Usuarios →** | `<Link>` card | `/dashboard/admin/users` |
| **Clientes →** | `<Link>` card | `/dashboard/clients` |
| **Obras →** | `<Link>` card | `/dashboard/projects` |

### Flujo
- **Entrada:** Desde `/dashboard` automáticamente, o desde cualquier vista con "Volver al admin".
- **Salidas:** Cards de módulo, cerrar sesión.

---

## 6. Gestión de Usuarios `/dashboard/admin/users`

**Archivo:** `src/app/dashboard/admin/users/page.tsx`

**Rol:** `super_admin` exclusivo.

### Elementos

| Elemento | Tipo | Destino / Acción | Notas |
|---|---|---|---|
| Título "Usuarios" | Texto | — | — |
| Subtítulo "Administracion de usuarios internos" | Texto | — | — |
| **Volver al admin** | `<Link>` subrayado | `/dashboard/admin` | — |
| Banners de feedback (error/created/updated/deactivated) | Condicional | — | Verdes o rojos según `searchParams` |
| **Formulario "Crear usuario interno"** | | | |
| Campo **Nombre** | `<input type="text" required>` | — | — |
| Campo **Email** | `<input type="email" required>` | — | — |
| Campo **Contrasena** | `<input type="password" required>` | — | — |
| Select **Rol** | `<select required>` | Opciones: `ingeniero`, `marketing` | — |
| Botón **Crear usuario** | `<button type="submit">` negro | Server Action `createInternalUserAction` | — |
| **Tabla de usuarios** | | | |
| Columnas: Nombre, Email, Rol, Activo, Acciones | Tabla | — | — |
| Badge de Rol | `<span>` con fondo gris | — | Muestra `super_admin`, `ingeniero`, `marketing`, `cliente` |
| Badge de Activo | Texto coloreado | — | Verde "Si" / Rojo "No" |
| **Editar (inline)** | Formulario con inputs | `updateInternalUserAction` | Solo visible para roles `ingeniero` y `marketing` |
| Campo Nombre (inline) | `<input>` | — | `defaultValue={user.name}` |
| Select Rol (inline) | `<select>` | — | Opciones: `ingeniero`, `marketing` |
| Botón **Guardar** (inline) | `<button>` gris | Server Action | — |
| Botón **Desactivar** (inline) | `<button>` rojo claro | `deactivateInternalUserAction` | Solo visible para `ingeniero` y `marketing` |
| "No editable" | Texto gris | — | Para `super_admin` y `cliente` |

### Comportamiento
- El super_admin no puede editarse ni desactivarse a sí mismo.
- No se puede desactivar a otro super_admin.
- Al desactivar, se invalidan sesiones de Supabase Auth (con try/catch).

---

## 7. Dashboard del Ingeniero `/dashboard/engineer`

**Archivo:** `src/app/dashboard/engineer/page.tsx`

**Roles:** `super_admin`, `ingeniero`.

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Título "Dashboard Ingeniero" | Texto | — |
| Subtítulo "Panel de ingenieria" | Texto | — |
| Card de perfil (Email, Nombre, Rol, Activo) | Texto informativo | — |
| **Gestionar clientes** | `<Link>` botón negro | `/dashboard/clients` |
| **Gestionar obras** | `<Link>` botón con borde | `/dashboard/projects` |
| **Cerrar sesion** | `<button>` con borde | Server Action `signOutAction` |

---

## 8. Dashboard de Marketing `/dashboard/marketing`

**Archivo:** `src/app/dashboard/marketing/page.tsx`

**Roles:** `super_admin`, `marketing`.

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Título "Dashboard Marketing" | Texto | — |
| Subtítulo "Panel de marketing" | Texto | — |
| Card de perfil (Email, Nombre, Rol, Activo) | Texto informativo | — |
| **Ver clientes** | `<Link>` botón negro | `/dashboard/clients` |
| **Ver obras** | `<Link>` botón con borde | `/dashboard/projects` |
| **Cerrar sesion** | `<button>` con borde | Server Action `signOutAction` |

### Restricciones
- En `/dashboard/clients`, marketing solo **ve** clientes activos (`listClients(true)`).
- No ve formularios de creación, edición ni botones de desactivar.
- No puede crear obras, solo ver las asignadas.

---

## 9. Dashboard del Cliente `/dashboard/client`

**Archivo:** `src/app/dashboard/client/page.tsx`

**Roles:** `cliente`, `super_admin` (redirigido a `/dashboard/admin`).

### Elementos

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Título "Mis obras" | Texto | — |
| Subtítulo "Bienvenido, {nombre}" | Texto | — |
| **Cerrar sesion** | `<button>` con borde | Server Action `signOutAction` |
| **Card Obras activas** | Estadística | Conteo de obras no completadas ni canceladas |
| **Card Completadas / canceladas** | Estadística | Conteo de obras finalizadas |
| Banners de feedback | Condicional | `error`, `comment-created`, `comment-deleted` |
| **Por cada obra:** | | |
| Nombre de la obra | Título | — |
| Descripción | Texto | — |
| Badge de estado | Coloreado por estado | `planeacion`, `en_progreso`, `en_pausa`, `completado`, `cancelado` |
| Barra de progreso | `<div>` con ancho % | Muestra `currentProgress%` |
| Fechas (Inicio, Fin estimado) | Texto | — |
| Equipo asignado | Badges con nombre y rol | Muestra `(ing. principal)`, `(ingeniero)`, `(marketing)` |
| Archivos de obra | `<FilePreview>` | Muestra nombre, tamaño, botón "Ver", imagen preview si es foto |
| **Actualizaciones (avances):** | | |
| Título del avance | Texto | — |
| Autor y fecha | Texto | — |
| Descripción del avance | Texto | — |
| Estado y progreso resultante | Badges | Si la actualización los incluye |
| Archivos del avance | `<FilePreview>` | Imágenes/videos |
| **Comentarios en avance:** | | |
| Contenido del comentario | Texto o `<InlineCommentEditor>` | — |
| Autor, fecha, "(editado)" | Texto | — |
| Botón **Editar** | `<button>` subrayado | Solo visible si el usuario es autor (o super_admin). Abre textarea inline. |
| Botón **Eliminar** | `<button>` rojo claro | Solo visible si el usuario puede eliminar. |
| Formulario **Nuevo comentario** | `<input>` + **Enviar** | `createUpdateCommentAction`. Visible para cliente, staff asignado, super_admin. |
| **Comentarios generales de obra:** | | |
| Igual que los de avance pero a nivel obra | `<InlineCommentEditor>` | — |
| Formulario **Nuevo comentario general** | `<input>` + **Enviar** | `createProjectCommentAction` |
| **ProjectRealtimeListener** | Componente invisible | Refresca la página al detectar cambios en BD |

---

## 10. Lista de Clientes `/dashboard/clients`

**Archivo:** `src/app/dashboard/clients/page.tsx`

**Roles:** `super_admin`, `ingeniero`, `marketing`.

### Elementos

| Elemento | Tipo | Destino / Acción | Visible para |
|---|---|---|---|
| Título "Clientes" | Texto | — | Todos |
| Subtítulo "Gestion de clientes" / "Visualizacion de clientes" | Texto | — | Varía según `canWrite` |
| **Volver al dashboard** | `<Link>` subrayado | `/dashboard` | Todos |
| Banners de feedback | Condicional | — | Todos |
| **Formulario "Crear cliente"** | | | `super_admin`, `ingeniero` |
| Campo **Nombre del cliente** | `<input required>` | — | Escritura |
| Select **Tipo de cliente** | `<select required>` | `persona`, `empresa` | Escritura |
| Campo **Telefono** | `<input maxLength={10}>` | — | Escritura |
| Campo **Documento** | `<input maxLength={10}>` | — | Escritura |
| Campo **Direccion** | `<input>` | — | Escritura |
| **Cuenta de acceso:** | Sección | — | Escritura |
| Campo **Nombre de usuario** | `<input required>` | — | Escritura |
| Campo **Email de acceso** | `<input required>` | — | Escritura |
| Campo **Contrasena temporal** | `<input required>` | — | Escritura |
| Botón **Crear cliente** | `<button>` negro | `createClientAction` | Escritura |
| **Tabla de clientes** | | | Todos |
| Columnas: Nombre, Tipo, Documento, Email, Estado, Acciones | Tabla | — | — |
| Badge de Tipo | `<span>` gris | `persona` / `empresa` | Todos |
| Estado Activo/Inactivo | Texto verde/rojo | — | Todos |
| **Editar (inline)** | Formulario | `updateClientAction` | Escritura |
| Campo Nombre (inline) | `<input>` | — | Escritura |
| Select Tipo (inline) | `<select>` | — | Escritura |
| Botón **Guardar** (inline) | `<button>` gris | — | Escritura |
| Botón **Desactivar** (inline) | `<button>` rojo claro | `deactivateClientAction` | Escritura |

### Restricciones
- `marketing` solo ve clientes cuyo usuario vinculado está activo (`listClients(true)`).
- `marketing` no ve formularios ni botones de acción (`canWrite = false`).

---

## 11. Lista de Obras `/dashboard/projects`

**Archivo:** `src/app/dashboard/projects/page.tsx`

**Roles:** `super_admin`, `ingeniero`, `marketing`.

### Elementos

| Elemento | Tipo | Destino / Acción | Visible para |
|---|---|---|---|
| Título "Obras" | Texto | — | Todos |
| Subtítulo "Gestion de obras" / "Visualizacion de obras" | Texto | — | Varía |
| **Volver al dashboard** | `<Link>` subrayado | `/dashboard` | Todos |
| Banners de feedback | Condicional | — | Todos |
| **Formulario "Crear obra"** | | | `super_admin`, `ingeniero` |
| Campo **Nombre de la obra** | `<input required>` | — | Escritura |
| Select **Cliente** | `<select required>` | Lista de clientes activos | Escritura |
| Select **Ingeniero principal** | `<select required>` | Lista de ingenieros activos | Escritura |
| Campo **Descripcion** | `<input>` | — | Escritura |
| Campo **Fecha inicio** | `<input type="date">` | — | Escritura |
| Campo **Fecha fin estimada** | `<input type="date">` | — | Escritura |
| Botón **Crear obra** | `<button>` negro | `createProjectAction` | Escritura |
| **Tabla de obras** | | | Todos |
| Columnas: Nombre, Cliente, Ing. Principal, Estado, Progreso, Creado por, Ver detalle, Acciones | Tabla | — | — |
| Badge de Estado | Coloreado | Verde (completado), rojo (cancelado), azul (en progreso), amarillo (en pausa), gris (planeacion) | Todos |
| Barra de progreso | `<div>` azul con % | — | Todos |
| **Ver detalle** | `<Link>` subrayado | `/dashboard/projects/{id}` | Todos |
| **Editar (inline)** | Formulario | `updateProjectAction` | Escritura |
| Campo Nombre (inline) | `<input>` | — | Escritura |
| Select Estado (inline) | `<select>` | 5 estados | Escritura |
| Campo Progreso (inline) | `<input type="number" min=0 max=100>` | — | Escritura |
| Botón **Guardar** (inline) | `<button>` gris | — | Escritura |
| Botón **Archivar** (inline) | `<button>` rojo claro | `archiveProjectAction` | Escritura |

### Restricciones
- `ingeniero` y `marketing` solo ven obras donde tienen asignación activa.
- `marketing` no puede crear ni editar obras (`canWrite = false`).
- Validación backend: `estimatedEndDate >= startDate`.

---

## 12. Detalle de Obra `/dashboard/projects/[projectId]`

**Archivo:** `src/app/dashboard/projects/[projectId]/page.tsx`

**Roles:** `super_admin`, y usuarios con asignación activa a la obra.

### Elementos

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Título (nombre de la obra) | Texto | — |
| Subtítulo: cliente · badge estado · progreso% | Texto | — |
| **Volver a obras** | `<Link>` subrayado | `/dashboard/projects` |
| Descripción de la obra | Texto | — |
| Banners de feedback (assigned, unassigned, update-created/edited/deleted, comment-created/edited/deleted, file-uploaded/deleted) | Condicional | — |
| **Tabla de Asignaciones** | | |
| Columnas: Usuario, Rol, Principal, Asignado, Acciones | Tabla | — |
| Badge de Rol | `<span>` gris | `ingeniero` / `marketing` |
| Badge "Principal" | Texto verde | Solo si `isPrincipal` |
| Botón **Hacer principal** | `<button>` azul claro | `setPrimaryEngineerAction`. Solo para `super_admin` en ingenieros no principales. |
| Botón **Desasignar** | `<button>` rojo claro | `unassignUserFromProjectAction` |
| **Formularios de asignación** | | |
| Select **Asignar ingeniero** + botón **Asignar** | `<select>` + `<button>` negro | `assignUserToProjectAction`. Solo `super_admin`. |
| Select **Asignar marketing** + botón **Asignar** | `<select>` + `<button>` negro | `assignUserToProjectAction`. `super_admin` o ingeniero principal. |
| **Formulario "Publicar actualización"** | | Solo visible si `canCreateUpdate`. `super_admin`, ingeniero/marketing asignados. |
| Campo **Titulo** | `<input required>` | — |
| Campo **Descripcion** | `<textarea>` | — |
| Select **Estado** | `<select>` | 5 estados + "sin cambio" |
| Campo **Progreso** | `<input type="number" min=0 max=100>` | — |
| Botón **Publicar actualizacion** | `<button>` negro | `createProjectUpdateAction` |
| **Sección Archivos de obra** | | |
| Botón **Subir** archivo | `<input type="file">` + `<button>` negro | `uploadProjectFileAction` |
| Lista de archivos con `<FilePreview>` | Nombre, tamaño, **Ver**, **Eliminar** | `deleteProjectFileAction` en archivos propios |
| **Sección Comentarios generales** | | |
| Formulario **Nuevo comentario** | `<input required>` + **Enviar** | `createProjectCommentAction` |
| Lista de comentarios con `<InlineCommentEditor>` | Botones **Editar**, **Eliminar** | Según permisos |
| **Lista de Actualizaciones** | | |
| Por cada actualización: | `<InlineUpdateEditor>` | Título, descripción editables inline. Autor, fecha. |
| Botón **Editar** | `<button>` subrayado | Abre formulario inline de edición. `canEdit`. |
| Botón **Eliminar** | `<button>` rojo claro | `deleteProjectUpdateAction`. Revertir progreso/estado si aplica. |
| Badges de estado/progreso resultante | `<span>` gris | Si la actualización los incluye |
| Archivos de la actualización | `<FilePreview>` | Con botón **Subir** archivo si `canAddUpdateFile` |
| **Comentarios en actualización:** | | |
| Formulario **Nuevo comentario** | `<input required>` + **Enviar** | `createUpdateCommentAction` |
| Lista de comentarios con `<InlineCommentEditor>` | Botones **Editar**, **Eliminar** | Según permisos |
| **ProjectRealtimeListener** | Componente invisible | Refresca al detectar cambios |

### Permisos de asignación
| Acción | super_admin | Ing. principal |
|---|---|---|
| Asignar ingeniero | Sí | No |
| Asignar marketing | Sí | Sí |
| Desasignar ingeniero | Sí | No |
| Desasignar marketing | Sí | Sí |
| Cambiar ing. principal | Sí | No |

---

## 13. Página 404 `/cualquier-ruta-inexistente`

**Archivo:** `src/app/not-found.tsx`

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Código "404" | Texto gigante gris claro | — |
| Título "Pagina no encontrada" | Texto | — |
| Mensaje descriptivo | Texto | — |
| **Volver al dashboard** | `<Link>` botón negro | `/dashboard` |
| **Ir al inicio de sesion** | `<Link>` botón con borde | `/login` |

---

## 14. Pantalla de Error `/dashboard/*`

**Archivo:** `src/app/dashboard/error.tsx`

| Elemento | Tipo | Destino / Acción |
|---|---|---|
| Título "Error inesperado" | Texto | — |
| Mensaje descriptivo | Texto | — |
| Detalle del error | Texto en caja roja | — |
| **Reintentar** | `<button>` negro | `router.refresh()` + `reset()` |

---

## 15. Estados de Carga (Skeletons)

| Ruta | Archivo | Diseño |
|---|---|---|
| `/dashboard/*` (genérico) | `loading.tsx` | Spinner animado + "Cargando..." |
| `/dashboard/clients` | `clients/loading.tsx` | Formulario skeleton (7 campos) + tabla skeleton (4 filas) |
| `/dashboard/projects` | `projects/loading.tsx` | Formulario skeleton (6 campos) + tabla skeleton (5 filas con barra de progreso) |
| `/dashboard/projects/[id]` | `projects/[id]/loading.tsx` | Header + tabla asignaciones (3 filas) + formulario + archivos + comentarios + 3 cards de actualizaciones |
| `/dashboard/client` | `client/loading.tsx` | Header + 2 cards resumen + 2 cards de obra con progreso, equipo, updates |

---

## 16. Flujo Completo de Navegación

```
/  ──"Iniciar sesion"──→  /login  ──"Ingresar"──→  /dashboard  ──(redirige por rol)──→
                                                          ├── super_admin → /dashboard/admin
                                                          │                    ├── "Usuarios" → /dashboard/admin/users
                                                          │                    │                  └── "Volver al admin" → /dashboard/admin
                                                          │                    ├── "Clientes" → /dashboard/clients
                                                          │                    │                  └── "Volver al dashboard" → /dashboard
                                                          │                    └── "Obras" → /dashboard/projects
                                                          │                                   ├── "Ver detalle" → /projects/[id]
                                                          │                                   │                    └── "Volver a obras" → /projects
                                                          │                                   └── "Volver al dashboard" → /dashboard
                                                          ├── ingeniero → /dashboard/engineer
                                                          │                  ├── "Gestionar clientes" → /clients
                                                          │                  ├── "Gestionar obras" → /projects
                                                          │                  └── "Cerrar sesion"
                                                          ├── marketing → /dashboard/marketing
                                                          │                  ├── "Ver clientes" → /clients
                                                          │                  ├── "Ver obras" → /projects
                                                          │                  └── "Cerrar sesion"
                                                          └── cliente → /dashboard/client
                                                                           └── "Cerrar sesion"

/login  ──"Registrate"──→  /register  ──"Crear cuenta"──→  /login?registered=true
/login  ──"Inicio"──→  /
/register  ──"Inicio"──→  /
/register  ──"Inicia sesion"──→  /login
```

---

## 17. Componentes Compartidos

### `InlineCommentEditor`
**Archivo:** `src/components/comments/inline-comment-editor.tsx`
- Modo lectura: muestra contenido + botón **Editar** (si `canEdit`).
- Modo edición: `<textarea>` + **Guardar** + **Cancelar** + contador de caracteres.
- Props: `commentId`, `initialContent`, `canEdit`, `editAction`, `returnTo`, `maxLength`.

### `InlineUpdateEditor`
**Archivo:** `src/components/updates/inline-update-editor.tsx`
- Modo lectura: muestra título + descripción + botón **Editar** (si `canEdit`).
- Modo edición: `<input>` título + `<textarea>` descripción + **Guardar** + **Cancelar**.
- Props: `updateId`, `initialTitle`, `initialDescription`, `canEdit`, `editAction`.

### `FilePreview`
**Archivo:** `src/components/files/file-preview.tsx`
- Muestra: preview de imagen (si es foto) o badge de tipo (Video/PDF/Archivo), nombre truncado, tamaño formateado, botón **Ver** (si hay signed URL).
- Soporta `children` para acciones adicionales (ej. botón Eliminar).

### `ProjectRealtimeListener`
**Archivo:** `src/components/realtime/project-realtime-listener.tsx`
- Componente invisible. Se suscribe a cambios en 7 tablas vía Supabase Realtime.
- Al detectar cambio, ejecuta `router.refresh()` con debounce de 2s.
- Props: `projectIds`, `updateIds?`.
