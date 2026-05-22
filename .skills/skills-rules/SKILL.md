---
name: skills-rules
description: Consultar antes de crear, actualizar o revisar skills del proyecto MYC para mantener consistencia, nombres, fuente de verdad y separación documental.
---

# Reglas Para Skills

## Propósito

Esta skill define reglas para crear, actualizar y mantener skills del proyecto MYC sin romper consistencia, arquitectura documental ni fuente de verdad.

## Fuentes De Verdad Y Precedencia

- `LORE.md` es la fuente original sobre el negocio, dominio, alcance funcional, reglas y arquitectura conceptual del proyecto.
- `AGENTS.md` es el orquestador raíz que indica qué fuente consultar según el tipo de tarea.
- Las skills existentes organizan información derivada para consultas especializadas.
- Si existe conflicto entre una skill y `LORE.md`, prevalece `LORE.md`.
- Si existe conflicto entre instrucciones del usuario y documentación del proyecto, seguir la instrucción del usuario solo si no contradice seguridad, integridad del proyecto o fuente de verdad.

## Reglas Generales Para Crear Skills

- Crear una skill solo cuando tenga un propósito claro y diferenciado.
- Definir el alcance antes de escribir contenido.
- Usar nombres en minúsculas con guiones.
- Hacer coincidir el nombre de carpeta con el `name` del frontmatter.
- Usar el archivo `SKILL.md` dentro de la carpeta de la skill.
- Escribir en español claro, profesional y directo.
- Usar información respaldada por `LORE.md`, skills existentes, `AGENTS.md` o estructura real del repositorio cuando aplique.
- Mantener cada skill enfocada en su tipo de información.

## Reglas Para Actualizar Skills Existentes

- Leer `LORE.md`, `AGENTS.md` y la skill actual antes de editar.
- Modificar solo el contenido relacionado con el propósito de la skill.
- Mantener el frontmatter válido.
- Preservar el nombre canónico de la skill y su carpeta.
- Reorganizar contenido cuando mejore claridad sin duplicar secciones completas.
- Eliminar redacción genérica que no ayude a agentes.
- Mantener trazabilidad conceptual hacia `LORE.md` cuando el contenido sea de negocio o arquitectura.

## Reglas De Nombres Y Frontmatter

- La carpeta de la skill debe usar guiones, por ejemplo `myc-business`.
- El campo `name` debe usar el mismo nombre de la carpeta.
- No usar guiones bajos como nombre canónico de skills.
- El archivo debe llamarse exactamente `SKILL.md`.
- Cada `SKILL.md` debe iniciar con frontmatter YAML válido delimitado por `---`.
- El frontmatter debe incluir `name` y `description`.
- La `description` debe explicar cuándo un agente debe consultar la skill.

## Reglas De Idioma Y Estilo

- Todo contenido del proyecto debe estar en español.
- Usar términos oficiales tal como aparecen en `LORE.md`.
- Mantener tono claro, técnico y útil para agentes.
- Evitar relleno, frases decorativas y promesas no sustentadas.
- Preferir listas breves y secciones con función clara.

## Reglas Anti-Alucinación

- No inventar información del proyecto.
- No convertir suposiciones en hechos.
- No agregar tecnologías, arquitectura, modelos de negocio, entidades, puntos de acceso, módulos, hoja de ruta ni flujos sin respaldo.
- Cuando un dato no esté respaldado, no documentarlo como hecho.
- Reformular información parcial de forma neutral usando solo lo confirmado.
- No crear listas de ausencias ni advertencias sobre madurez del proyecto.
- No usar conocimiento externo para completar detalles del dominio.

## Separación De Contenido

- `myc-business` contiene negocio, actores, reglas de negocio, alcance funcional, propuesta de valor y lenguaje del dominio.
- `myc-architecture` contiene arquitectura conceptual, entidades, relaciones, flujos técnicos, permisos, trazabilidad, tecnologías declaradas y criterios de desarrollo.
- `skills-rules` contiene reglas para gobernar creación, actualización y revisión de skills.
- `AGENTS.md` contiene orquestación: qué leer, en qué orden y bajo qué reglas.
- Las skills informativas no deben mezclarse con planes de implementación.
- Las instrucciones de ejecución pertenecen a `AGENTS.md` o a una skill operativa cuyo propósito lo justifique.

## Reglas Para Evitar Duplicación

- No copiar `LORE.md` completo dentro de una skill.
- Resumir y organizar información según el propósito de la skill.
- Usar referencias a rutas cuando el detalle completo vive en otro archivo.
- Mantener `AGENTS.md` como índice de consulta, no como copia de las skills.
- Si una regla aplica a varias skills, colocarla en `skills-rules` y referenciarla desde `AGENTS.md`.

## Skills Informativas

- Una skill informativa debe ayudar a comprender el proyecto.
- Una skill informativa puede incluir criterios de lectura o interpretación cuando sean necesarios para evitar errores.
- Una skill informativa no debe contener pasos de ejecución, planes de entrega ni tareas secuenciales de implementación.
- Una skill informativa debe preservar la diferencia entre hechos confirmados, reglas del dominio y criterios técnicos.

## Rol De AGENTS.md

- `AGENTS.md` debe ser el orquestador principal para agentes.
- Debe indicar cuándo consultar `LORE.md` y cada skill.
- Debe mantener el orden recomendado de lectura.
- Debe incluir reglas anti-alucinación de alto nivel.
- No debe duplicar el contenido completo de las skills.

## Checklist De Validación

- La skill está en `.skills/<nombre-con-guiones>/SKILL.md`.
- El `name` coincide con la carpeta.
- El frontmatter YAML inicia y termina con `---`.
- El frontmatter contiene `name` y `description`.
- La descripción explica cuándo consultar la skill.
- El contenido está en español.
- El contenido respeta la fuente de verdad.
- El contenido mantiene separación entre negocio, arquitectura, operación y orquestación.
- La skill no duplica `LORE.md` sin propósito.
- La skill no agrega información sin respaldo.
- Las skills informativas no contienen instrucciones operativas innecesarias.
- `AGENTS.md` referencia la skill cuando sea relevante para agentes.
