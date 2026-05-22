---
name: myc-architecture
description: Consultar para entender arquitectura conceptual, entidades, flujos técnicos, tecnologías declaradas y criterios de desarrollo del proyecto MYC.
---

# Arquitectura MYC

## Propósito

Esta skill es la fuente técnica y arquitectónica del proyecto MYC. Organiza la información técnica disponible en `LORE.md` y la estructura real observable del repositorio para agentes que creen, modifiquen o revisen código.

## Resumen Técnico

MYC es una aplicación interna para seguimiento de obras de una sola constructora. El dominio se organiza alrededor de clientes, obras, usuarios con roles, asignaciones por obra, actualizaciones, archivos, comentarios, estado, progreso e historial.

## Estructura Actual Del Repositorio

- `package.json` declara el proyecto privado `myc`.
- `src/app/` contiene la entrada actual de la aplicación.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` y `postcss.config.mjs` contienen configuración técnica del repositorio.
- `public/` contiene recursos públicos.
- `LORE.md` contiene la fuente original del conocimiento del proyecto.
- `.agents/skills/` contiene skills documentales y operativas del proyecto.

Tecnologías instaladas actualmente y declaradas en `package.json`:

- Next.js `16.2.6`.
- React `19.2.4`.
- React DOM `19.2.4`.
- TypeScript `^5`.
- ESLint `^9` con `eslint-config-next` `16.2.6`.
- Tailwind CSS `^4` con `@tailwindcss/postcss` `^4`.
- `babel-plugin-react-compiler` `1.0.0`.
- Supabase JS y Supabase SSR.
- Prisma y Prisma Client.

Decisión técnica de datos y autenticación:

- Base de datos principal: PostgreSQL.
- Plataforma backend gestionada: Supabase.
- ORM/capa de acceso a datos de la aplicación: Prisma.
- Autenticación: Supabase Auth apoyado en PostgreSQL.
- La integración actual cubre Google OAuth, login/registro con email/password, sesión SSR con cookies, ruta protegida `/protected` con validación servidor y seed de administrador vía `npm run seed:admin`. No incluye modelos de negocio, roles del dominio, RLS, perfiles ni autorización por obra asignada.

## Arquitectura Conceptual

- La aplicación atiende a una sola constructora.
- El acceso se organiza por roles: `super_admin`, `ingeniero`, `marketing` y `cliente`.
- La obra es el centro del seguimiento operativo: pertenece a un cliente, tiene responsables asignados, estado, progreso, archivos, actualizaciones, comentarios e historial.
- Los usuarios internos operan sobre obras mediante asignaciones.
- El cliente consulta únicamente sus propias obras y participa mediante comentarios.
- Los cambios de estado y progreso se reflejan en la obra y se registran en historial.
- El borrado lógico aplica a las entidades principales indicadas en `LORE.md`.

## Componentes Funcionales

- Módulo de usuarios: crear, editar, activar o desactivar usuarios y asignar rol.
- Módulo de clientes: crear y editar clientes, asociar cuenta y listar obras del cliente.
- Módulo de obras: crear y editar obras, asignar personal, cambiar estado, cambiar progreso y archivar obra.
- Módulo de actualizaciones: crear actualización, editar o eliminar lógicamente actualización propia y adjuntar fotos o videos.
- Módulo de archivos de obra: subir archivos generales, listar PDFs, documentos o fotos y eliminar lógicamente archivos.
- Módulo de comentarios: comentar actualización, comentar obra y editar comentario propio.
- Módulo de cliente: ver obras, estado, progreso, actualizaciones, archivos de obra y comentar.

## Entidades Y Responsabilidades

- Usuario: representa una cuenta que entra al sistema. Tiene rol, estado activo y campos de trazabilidad.
- Cliente: representa la entidad comercial persona o empresa. Tiene una cuenta asociada y puede tener muchas obras.
- Obra: representa el proyecto de construcción. Contiene cliente, nombre, descripción, estado actual, progreso actual, fechas, archivado y trazabilidad.
- Asignación de obra: relaciona usuarios internos con una obra mediante `rol_asignacion`, `es_principal`, fechas de asignación y desasignación.
- Actualización de obra: representa una publicación de avance con autor, título, descripción, fecha efectiva, estado o progreso resultante opcional y trazabilidad.
- Archivo de actualización: adjunto de foto o video asociado a una actualización.
- Archivo de obra: archivo general asociado a la obra, con tipo, URL, nombre, tamaño y trazabilidad.
- Historial de estado de obra: registra cambios formales de estado y progreso, quién los hizo y la actualización relacionada si aplica.
- Comentario de actualización: comentario dentro de una actualización.
- Comentario general de obra: mensaje general asociado directamente a la obra.

## Relaciones De Datos

- Cliente tiene una cuenta de usuario.
- Cliente posee muchas obras.
- Obra tiene muchas asignaciones.
- Usuario puede estar asignado a muchas obras.
- Obra tiene muchas actualizaciones.
- Usuario crea actualizaciones.
- Actualización contiene archivos de actualización.
- Obra contiene archivos generales.
- Obra registra historial de estado.
- Usuario realiza cambios de historial.
- Actualización recibe comentarios.
- Obra recibe comentarios generales.
- Usuario escribe comentarios.
- Una actualización puede originar un registro de historial.

## Enumeraciones Del Dominio

Roles de usuario:

- `super_admin`
- `ingeniero`
- `marketing`
- `cliente`

Tipos de cliente:

- `persona`
- `empresa`

Estados de obra:

- `planeacion`
- `en_progreso`
- `en_pausa`
- `completado`
- `cancelado`

Roles de asignación:

- `ingeniero`
- `marketing`

Tipos de archivo de actualización:

- `foto`
- `video`

Tipos de archivo de obra:

- `foto`
- `documento`
- `pdf`
- `otro`

## Flujos Técnicos Relevantes

Alta de cliente:

1. `super_admin` o `ingeniero` crea el cliente.
2. Se crea la cuenta de acceso del cliente.
3. El cliente queda listo para asociarse a obras.

Creación de obra:

1. `ingeniero` crea la obra.
2. Asocia el cliente.
3. Asigna ingeniero principal.
4. Asigna marketing si aplica.
5. Define estado inicial `planeacion`.
6. Define progreso inicial `0`.

Actualización de obra:

1. `ingeniero` o `marketing` asignado entra a la obra.
2. Crea actualización.
3. Agrega título.
4. Agrega descripción opcional.
5. Sube fotos o videos.
6. Opcionalmente actualiza estado o progreso.
7. Si cambia estado o progreso, se registra historial.

Comentarios:

1. Cliente, ingeniero o marketing entran a una actualización.
2. Dejan comentario.
3. Pueden editar solo su propio comentario.
4. `super_admin` puede intervenir cualquier comentario.

Mensajes generales de obra:

1. Cliente, ingeniero o marketing entran a la obra.
2. Crean comentario general.
3. La conversación queda asociada a la obra.
4. Pueden editar solo su propio comentario.

Cierre de obra:

1. El personal cambia progreso o estado.
2. Si progreso es `100`, el estado es `completado`.
3. La obra pasa a archivada.
4. El cliente aún puede consultarla.

## Reglas Técnicas De Permisos

- `super_admin` tiene control total y soporte total.
- Ingeniero y marketing solo operan sobre obras a las que están asignados, salvo intervención de `super_admin`.
- Solo `ingeniero` o `super_admin` pueden crear obras.
- Marketing no puede crear obras ni cambiar el cliente asociado a una obra.
- Solo ingeniero o marketing asignados pueden crear actualizaciones.
- Solo el autor de una actualización o `super_admin` pueden editarla o eliminarla lógicamente.
- Cliente, ingeniero y marketing pueden comentar.
- Cada usuario edita solo sus propios comentarios.
- `super_admin` puede intervenir cualquier comentario.
- Cliente solo ve sus propias obras.
- Supabase Auth debe resolver autenticación, pero la autorización de negocio debe validar rol, autoría y asignación por obra.
- No tratar una sesión autenticada como permiso suficiente para leer o modificar datos del dominio.

## Criterios Para Supabase, Prisma Y PostgreSQL

- Usar Prisma para modelado y acceso a datos de la aplicación sobre PostgreSQL.
- Usar Supabase como proveedor gestionado de PostgreSQL y autenticación.
- Consultar `.agents/skills/supabase/SKILL.md` antes de implementar autenticación, clientes, migraciones, RLS, Storage, Edge Functions o configuración de Supabase.
- Consultar `.agents/skills/supabase-postgres-best-practices/SKILL.md` antes de diseñar u optimizar esquemas, consultas, índices, RLS o configuración de PostgreSQL.
- Mantener credenciales, URLs y secretos en variables de entorno; no hardcodearlos en código, documentación pública ni ejemplos reales.
- No inventar tablas, modelos Prisma, políticas RLS, buckets, providers OAuth ni flujos de login sin respaldo en `LORE.md` o una decisión explícita posterior.
- Si se exponen tablas mediante APIs de Supabase, las políticas de acceso deben reflejar las reglas del dominio y no limitarse a verificar autenticación.

## Estado, Progreso Y Trazabilidad

- El estado actual vive en la obra.
- Todo cambio de estado o progreso debe quedar registrado en historial.
- Si el progreso llega a `100`, el estado cambia automáticamente a `completado`.
- Una obra `completada` o `cancelada` queda archivada pero visible para el cliente.
- Debe registrarse quién creó, quién editó, quién cambió estado, cuándo ocurrió y sobre qué obra ocurrió.

## Archivos Y Multimedia

- La actualización de obra contiene fotos o videos.
- La actualización debe tener `título` obligatorio y `descripción` opcional.
- El archivo de actualización usa tipos `foto` o `video`.
- El archivo general de obra usa tipos `foto`, `documento`, `pdf` u `otro`.
- Los archivos generales de obra cubren contratos, PDFs, documentos e imágenes generales de la obra.
- No asumir proveedor, peso máximo, formatos permitidos ni política de borrado de archivos desde esta skill.

## Principios De Desarrollo

- Mantener separación entre comentarios de actualización y comentarios generales de obra.
- Implementar controles de acceso por obra asignada para proteger permisos.
- Registrar historial cuando cambie estado o progreso.
- Aplicar borrado lógico en usuarios, clientes, obras, actualizaciones, comentarios y archivos.
- Mantener la relación de una obra con un solo cliente.
- Mantener una sola cuenta de acceso por cliente.
- Mantener al menos un ingeniero asignado y un ingeniero principal por obra.
- Evitar introducir multiempresa, aprobación de actualizaciones, comentarios internos ocultos al cliente, permisos avanzados por acción o chat en tiempo real como comportamiento del MVP.
- Cuando un cambio toque APIs o convenciones de Next.js, revisar la documentación local en `node_modules/next/dist/docs/` antes de modificar código.
- Toda implementación futura de Supabase, Prisma o PostgreSQL debe mantener TypeScript strict, evitar `any`, y pasar `npm run lint` y `npm run build` antes de entrega.

## Criterios Para Decisiones Técnicas Futuras

- Alinear permisos con rol, autoría y asignación por obra.
- Priorizar trazabilidad cuando una acción afecte estado, progreso, creación, edición o eliminación lógica.
- Conservar visibilidad del cliente sobre obras completadas o canceladas.
- Preservar contexto textual en actualizaciones con título obligatorio.
- Mantener el vocabulario oficial de roles, estados y tipos descrito en `LORE.md`.
