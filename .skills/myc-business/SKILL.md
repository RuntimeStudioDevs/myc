---
name: myc-business
description: Consultar para comprender el negocio, roles, alcance funcional, reglas de negocio y lenguaje oficial del proyecto MYC.
---

# Negocio MYC

## Propósito

Esta skill es la fuente de información de negocio del proyecto MYC. Su contenido resume y organiza la información funcional disponible en `LORE.md` para agentes de producto, documentación, soporte, marketing, ventas y estrategia.

## Resumen Del Proyecto

MYC es una plataforma interna para una sola constructora. Permite administrar clientes y obras, asignar responsables por obra, publicar avances, centralizar la comunicación de seguimiento y habilitar la consulta del cliente sobre sus obras, historial, progreso y conversación.

## Propósito Del Producto

El producto busca dar a la constructora un sistema centralizado para gestionar el seguimiento de obras y la comunicación entre personal interno y clientes.

## Problema Que Resuelve

El problema expresado en `LORE.md` es la necesidad de centralizar en un solo lugar la administración de clientes, obras, avances, progreso, historial y conversaciones asociadas al seguimiento de construcción.

## Tipo De Negocio Y Clientes

- El sistema es para una sola constructora.
- No es multiempresa.
- Un cliente puede ser persona o empresa.
- Cada cliente tiene una sola cuenta de acceso.
- Un cliente puede tener muchas obras.
- Una obra pertenece a un solo cliente.
- El `super_admin` tiene soporte total sobre el sistema.

## Actores Y Roles

- `super_admin`: tiene control total, puede intervenir en usuarios, clientes, obras, responsables, actualizaciones y comentarios. No es un rol operativo del negocio, pero puede actuar como soporte total.
- `ingeniero`: puede crear clientes, cuentas de cliente y obras; asignar personal; cambiar estado y progreso; crear actualizaciones; comentar; y editar solo su propio contenido, salvo intervención de `super_admin`.
- `marketing`: puede crear actualizaciones, comentar, cambiar estado y progreso, y editar solo su propio contenido. No puede crear obras ni cambiar el cliente asociado a una obra.
- `cliente`: puede iniciar sesión, consultar sus obras, ver estado, progreso, actualizaciones y archivos, comentar en actualizaciones y crear mensajes generales dentro de la obra.

## Propuesta De Valor

- Centraliza el seguimiento de obras para una constructora.
- Da visibilidad al cliente sobre sus obras activas, completadas, canceladas y archivadas.
- Organiza responsables internos por obra.
- Mantiene historial de estado y progreso.
- Conserva conversaciones asociadas a actualizaciones y a la obra.
- Permite soporte total mediante el rol `super_admin`.

## Objetivos De Negocio

- Crear y administrar clientes.
- Crear y administrar obras.
- Asignar ingenieros y personal de marketing por obra.
- Publicar avances de obra.
- Permitir que el cliente consulte sus obras, historial, progreso y conversación.
- Centralizar la comunicación de seguimiento.

## Alcance Funcional Del MVP

Incluye:

- Autenticación.
- Roles.
- CRUD de usuarios.
- CRUD de clientes.
- CRUD de obras.
- Asignaciones por obra.
- Estado actual e historial.
- Progreso.
- Actualizaciones.
- Comentarios en actualización.
- Comentarios generales de obra.
- Archivos generales de obra.
- Vista cliente.
- Archivado.
- Borrado lógico.
- Trazabilidad básica.

Fuera del MVP declarado en `LORE.md`:

- Notificaciones.
- Aprobación de actualizaciones.
- Comentarios internos ocultos al cliente.
- Multiempresa.
- Múltiples cuentas por cliente empresa.
- Versionado de archivos.
- Permisos avanzados por acción.
- Chat en tiempo real.

## Reglas De Negocio Clave

- Solo `ingeniero` o `super_admin` pueden crear una obra.
- Toda obra debe tener cliente asociado.
- Toda obra debe tener al menos un ingeniero asignado.
- Toda obra debe tener un ingeniero principal.
- Ingenieros y marketing se asignan por obra.
- Solo usuarios asignados a una obra pueden operar sobre ella, salvo `super_admin`.
- `super_admin` puede intervenir sin estar asignado.
- Solo ingeniero o marketing asignados pueden crear actualizaciones.
- Las actualizaciones se publican directo y no requieren aprobación previa.
- Solo el autor de una actualización o `super_admin` pueden editarla o eliminarla lógicamente.
- Cliente, ingeniero y marketing pueden comentar.
- Cada usuario solo puede editar sus propios comentarios.
- `super_admin` puede intervenir cualquier comentario.
- El estado actual vive en la obra.
- Todo cambio de estado o progreso se guarda en historial.
- Si el progreso llega a `100`, el estado cambia automáticamente a `completado`.
- Una obra `completada` o `cancelada` queda archivada pero visible para el cliente.
- Se usa borrado lógico en usuarios, clientes, obras, actualizaciones, comentarios y archivos.
- Debe mantenerse trazabilidad de quién creó, quién editó, quién cambió estado, cuándo ocurrió y sobre qué obra ocurrió.

## Conceptos Clave Del Dominio

- Usuario: cuenta que entra al sistema.
- Cliente: entidad comercial que puede ser persona o empresa y tiene una cuenta de acceso.
- Obra: proyecto de construcción asociado a un cliente.
- Asignación de obra: relación entre usuarios internos y una obra.
- Actualización de obra: publicación de avance con título, descripción opcional y fotos o videos.
- Archivo de actualización: adjunto de foto o video asociado a una actualización.
- Archivo de obra: archivo general de la obra, como contratos, PDFs, documentos o imágenes generales.
- Historial de estado: registro formal de cambios de estado y progreso.
- Comentario de actualización: comentario dentro de una actualización.
- Comentario general de obra: mensaje general asociado a una obra.

## Lenguaje Oficial Del Proyecto

Roles:

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

Tipos de archivo de actualización:

- `foto`
- `video`

Tipos de archivo de obra:

- `foto`
- `documento`
- `pdf`
- `otro`

## Restricciones De Negocio

- La plataforma atiende a una sola constructora.
- Una obra no puede pertenecer a más de un cliente.
- Un cliente no puede tener más de una cuenta de acceso.
- Una obra requiere al menos un ingeniero asignado y un ingeniero principal.
- El marketing principal no es obligatorio.
- Los clientes solo ven sus propias obras.
- Marketing no puede crear obras ni cambiar el cliente asociado a una obra.

## Prioridades Y Criterios De Decisión

- Mantener el contexto de las actualizaciones mediante `título` obligatorio y `descripción` opcional.
- Proteger la operación por obra asignada mediante reglas de acceso claras.
- Separar comentarios generales de obra y comentarios de actualización.
- Mantener visibilidad de obras completadas o canceladas para el cliente mediante archivado.
- Preservar trazabilidad básica en cambios y acciones relevantes.
