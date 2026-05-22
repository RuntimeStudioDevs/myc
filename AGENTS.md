# Guía Raíz Para Agentes

`AGENTS.md` es la guía raíz para agentes que trabajen en este repositorio. Su función es orientar qué fuentes leer, en qué orden consultarlas y cómo evitar información inventada sobre el proyecto MYC.

## Fuentes De Información Del Proyecto

| Fuente | Cuándo consultarla |
| --- | --- |
| `LORE.md` | Siempre que se necesite la fuente original sobre negocio, dominio, alcance funcional, reglas, entidades o flujos. |
| `.agents/skills/myc-business/SKILL.md` | Cuando la tarea trate sobre negocio, producto, roles, reglas de negocio, alcance funcional, clientes, actores o lenguaje oficial. |
| `.agents/skills/myc-architecture/SKILL.md` | Cuando la tarea trate sobre arquitectura, entidades, relaciones, permisos, trazabilidad, flujos técnicos, tecnologías declaradas o cambios de código. |
| `.agents/skills/skills-rules/SKILL.md` | Antes de crear, actualizar o revisar cualquier skill del proyecto. |
| `.agents/skills/project-best-practices/SKILL.md` | Antes de modificar código, crear componentes, agregar dependencias o tomar decisiones estructurales. Define el flujo de trabajo obligatorio y las reglas de consistencia. |
| `.agents/skills/supabase/SKILL.md` | Cuando la tarea involucre Supabase: base de datos, Auth, Edge Functions, Realtime, Storage, clientes SSR, RLS, migraciones, logs o CLI. |
| `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Cuando la tarea involucre diseño, revisión u optimización de consultas, esquemas, índices, RLS, rendimiento o configuración de Postgres en Supabase. |

## Orden Recomendado De Lectura

1. Leer la instrucción actual del usuario.
2. Leer este `AGENTS.md` para ubicar las fuentes correctas.
3. Consultar `project-best-practices` para aplicar el flujo de trabajo y reglas antes de modificar código.
4. Consultar `LORE.md` como fuente original del proyecto.
5. Consultar `myc-business` si la tarea es de negocio, producto, soporte, documentación funcional o estrategia.
6. Consultar `myc-architecture` si la tarea es técnica, arquitectónica, de desarrollo o revisión de código.
7. Consultar `skills-rules` antes de crear o modificar skills.
8. Consultar `supabase` si la tarea involucra cualquier producto, cliente, integración, migración, autenticación, logs o configuración de Supabase.
9. Consultar `supabase-postgres-best-practices` si la tarea involucra diseño, revisión u optimización de Postgres en Supabase.

## Reglas Para Agentes

- Usar `LORE.md` como fuente original del proyecto.
- Usar las skills como vistas organizadas de la información, no como reemplazo de `LORE.md`.
- Si existe conflicto entre una skill y `LORE.md`, prevalece `LORE.md`.
- Si existe conflicto entre instrucciones del usuario y documentación del proyecto, seguir la instrucción del usuario solo si no contradice seguridad, integridad del proyecto o fuente de verdad.
- Consultar `.agents/skills/myc-business/SKILL.md` para entender negocio y dominio.
- Consultar `.agents/skills/myc-architecture/SKILL.md` para entender arquitectura y desarrollo.
- Consultar `.agents/skills/project-best-practices/SKILL.md` antes de modificar código, crear componentes, agregar dependencias o tomar decisiones estructurales.
- Consultar `.agents/skills/skills-rules/SKILL.md` antes de crear o modificar cualquier skill.
- Consultar `.agents/skills/supabase/SKILL.md` antes de trabajar con Supabase.
- Consultar `.agents/skills/supabase-postgres-best-practices/SKILL.md` antes de diseñar, revisar u optimizar Postgres en Supabase.
- Mantener respuestas y documentación del proyecto en español claro.

## Reglas Anti-Alucinación

- No inventar información del proyecto.
- No convertir suposiciones en hechos.
- No agregar tecnologías, modelos de negocio, arquitectura, flujos, entidades, módulos, puntos de acceso o estrategias sin respaldo en `LORE.md` o en la estructura real del repositorio.
- Si una sección requiere información parcial, redactar solo con lo confirmado y de forma neutral.
- No duplicar contenido documental sin propósito.

## Mantenimiento De Documentación

- Mantener `AGENTS.md` como orquestador breve, no como copia de las skills.
- Mantener `LORE.md` como fuente original de negocio y dominio.
- Actualizar las skills cuando sea necesario organizar información ya respaldada.
- Antes de editar skills, leer `.agents/skills/skills-rules/SKILL.md`.
- Las skills informativas deben conservar su función documental y no transformarse en planes de implementación.
- El resultado documental debe ser revisable por humanos y útil para futuros agentes.
