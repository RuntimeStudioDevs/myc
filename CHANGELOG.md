# Changelog

Todos los cambios importantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) con fecha en orden cronologico inverso.

---

## [2026-05-27] — Auditoria de reglas de negocio y hardening

### Corregido

- **Progreso inconsistente al eliminar actualizaciones**: `deleteProjectUpdateAction` solo hacia soft-delete sin revertir `currentProgress`. Ahora busca el `ProjectStatusHistory` vinculado a la actualizacion eliminada y restaura el progreso/estado anterior dentro de una transaccion. Si la actualizacion tenia `resultingProgress`, el proyecto vuelve al progreso previo valido. Se registra entrada en `ProjectStatusHistory` con observacion "Actualizacion eliminada — progreso revertido".
- **Super admin no podia crear actualizaciones**: `canCreateProjectUpdate` bloqueaba `super_admin`. Ahora retorna `true` antes del check de rol/assignment. Super admin tiene control total.
- **Sin validacion de longitud para `phone` y `document`**: Agregada validacion backend (max 10 chars) en `createClientAction` y `updateClientAction`. Agregado `maxLength={10}` en formularios frontend de clientes.
- **Sin validacion de fechas en obras**: `estimatedEndDate < startDate` era aceptado. Agregada validacion en `createProjectAction` y `updateProjectAction`. Rechaza con `error=invalid-dates`.


### Corregido

- Redireccion rota de `super_admin` hacia `/dashboard/admin` (ruta inexistente). Ahora apunta a `/dashboard/admin/users`. (Bug critico)
- Perdida de datos en edicion inline de clientes: los campos `phone`, `document` y `address` se perdi'an al guardar desde la tabla. Agregados inputs ocultos para preservarlos.
- Perdida de la descripcion en edicion inline de obras: el campo `description` no se enviaba en el formulario de la tabla de proyectos. Agregado input oculto.
- Falta de UI para editar actualizaciones de obra en la vista de detalle: solo existi'a el boton de eliminar. Creado `InlineUpdateEditor` con toggle de edicion inline.
- Inconsistencia visual del estado `en_pausa`: no teni'a color distintivo en la tabla de proyectos ni en el detalle. Agregado `bg-yellow-100 text-yellow-800`.
- Links de navegacion en login y register usaban `<a href>` en lugar de `<Link>` de Next.js, provocando full page reload. Reemplazados.
- Manejo inseguro del fallo de `signOut` en Supabase Auth al desactivar usuarios: si la API fallaba, la excepcion no se capturaba. Envuelto en `try/catch` con `console.warn`.
- Fallback para roles desconocidos en `/dashboard`: mostraba pagina estatica ambigua en lugar de redirigir. Ahora redirige a `/login?error=unknown-role`.
- Cleanup asincrono de canales Realtime no manejaba la Promise retornada por `supabase.removeChannel()`. Agregado `.catch(() => {})`.
- Formularios de comentarios sin atributo `required` permiti'an envios vacios desde el frontend. Agregado `required` en todos los inputs de contenido.
- Imports no usados en `lib/projects/assignments/actions.ts` y `lib/projects/updates/actions.ts`. Eliminados.

### Anadido

- Componente `InlineUpdateEditor` (`src/components/updates/inline-update-editor.tsx`) para edicion inline de actualizaciones con toggle mostrar/editar.
- Skeleton loading especifico para `/dashboard/clients` (`loading.tsx`): tabla con 4 filas simuladas y formulario skeleton.
- Skeleton loading especifico para `/dashboard/projects` (`loading.tsx`): tabla con 5 filas, barra de progreso simulada.
- Skeleton loading especifico para `/dashboard/projects/[projectId]` (`loading.tsx`): detalle con secciones de asignaciones, actualizaciones y comentarios.
- Skeleton loading especifico para `/dashboard/client` (`loading.tsx`): cards de resumen y obras con progreso simulado.
- Pagina 404 personalizada (`src/app/not-found.tsx`) con diseno MYC: codigo "404", mensaje descriptivo, botones a dashboard y login.
- `loading.tsx` generico para `/dashboard` como fallback de segmentos sin loading propio.
- `error.tsx` para `/dashboard` con mensaje amigable, detalle del error y boton de reintento.
- `README.md` tecnico completo: stack, instalacion, variables de entorno, estructura del proyecto, rutas, roles, permisos, flujo de auth, pruebas y validacion.
- `.env.example` con las 5 variables de entorno requeridas, placeholders seguros y comentarios por seccion.
- 34 nuevos tests de permisos en 4 archivos (`projects.test.ts`, `updates.test.ts`, `assignments.test.ts`, `clients.test.ts`). Total: 74 tests en 6 archivos.
- `CHANGELOG.md` (este archivo).

### Cambiado

- Permisos del rol `marketing` sobre clientes: ahora solo visualiza clientes activos en modo lectura. La query `listClients` acepta parametro `onlyActiveUsers` que filtra por `user.active === true`. Las acciones de escritura permanecen bloqueadas para marketing.
- `generateSignedUrl` en `lib/projects/storage.ts` ahora usa `React.cache()` para deduplicar llamadas por `filePath` dentro de un mismo request.
- El dashboard (`/dashboard`) redirige roles desconocidos a `/login?error=unknown-role` en lugar de mostrar pagina estatica.
- El `loading.tsx` generico de `/dashboard` queda como fallback; los 4 segmentos principales tienen su propio skeleton contextualizado.
- Retry de perfil en `signUpAction`: espera hasta 1.5s (5 intentos x 300ms) a que el trigger de BD cree el perfil de dominio tras el registro en Supabase Auth.

### Tecnico

- Validacion completa del proyecto: `npx eslint --cache .` (0 errores), `npx vitest run` (74 tests pasan), `npx next build` (compilacion exitosa, 14 paginas, Proxy activo).
- Proxy de Next.js 16 confirmado como `src/proxy.ts` (no `middleware.ts`).
- Prisma Client generado en `src/generated/prisma/`.
- Documentacion de las 5 variables de entorno sin exponer valores reales.
- Cobertura de tests de permisos: comentarios, archivos, proyectos, actualizaciones, asignaciones y clientes.
