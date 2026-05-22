---
name: project-best-practices
description: Guia operativa obligatoria de buenas practicas de trabajo para agentes que modifican codigo en el proyecto MYC. Define flujo de trabajo, reglas de consistencia, validaciones y criterios de entrega.
---

# Buenas Practicas De Trabajo — Proyecto MYC

## Proposito

Esta skill define el flujo de trabajo obligatorio para cualquier agente que modifique codigo en el proyecto MYC. Su objetivo es mantener consistencia estructural, prevenir deuda tecnica y garantizar que todos los agentes — independientemente de su capacidad — sigan el mismo proceso antes, durante y despues de modificar codigo.

## Cuando Activar Esta Skill

Activar esta skill siempre que la tarea implique:

- Crear, modificar o eliminar archivos del proyecto.
- Agregar componentes, rutas, servicios, hooks, utilidades, estilos o configuracion.
- Instalar o remover dependencias.
- Refactorizar codigo existente.
- Tomar decisiones sobre estructura de carpetas o patrones de codigo.
- Resolver bugs que requieran cambios en el codigo.

No activar para tareas exclusivamente informativas, de consulta o de documentacion.

## Stack Del Proyecto

| Tecnologia | Version |
|---|---|
| Next.js | 16.2.6 |
| React | 19.2.4 |
| TypeScript | ^5 (strict) |
| Tailwind CSS | ^4 |
| ESLint | ^9 + eslint-config-next |
| React Compiler | Habilitado via next.config.ts |
| Runtime | Node.js (default de Next.js) |
| Supabase JS | Instalado para Auth/SSR |
| Supabase SSR | Instalado para cookies en App Router |
| Prisma | Instalado para PostgreSQL/Supabase |
| Prisma Client | Instalado |

Decisiones tecnicas de datos y autenticacion:

- Base de datos principal: PostgreSQL.
- Plataforma backend gestionada: Supabase.
- ORM/capa de acceso a datos de la aplicacion: Prisma.
- Autenticacion: Supabase Auth apoyado en PostgreSQL.
- La integracion actual cubre Google OAuth, login/registro con email/password, sesion SSR con cookies, ruta protegida `/protected` con validacion servidor y seed de administrador via `npm run seed:admin`. No incluye modelos de negocio, roles del dominio, RLS, perfiles ni autorizacion por obra asignada.

## Estructura Del Proyecto

```
myc/
  src/
    app/                  # App Router de Next.js
      layout.tsx          # Layout raiz
      page.tsx            # Pagina principal
      globals.css         # Estilos globales (Tailwind)
  .agents/skills/         # Skills documentales y operativas del proyecto
  public/                 # Recursos estaticos
  LORE.md                 # Fuente original del proyecto
  AGENTS.md               # Orquestador raiz para agentes
  CLAUDE.md               # Redirige a AGENTS.md
  package.json            # Dependencias y scripts
  tsconfig.json           # Config TypeScript (strict, path alias)
  next.config.ts          # Config Next.js (reactCompiler: true)
  eslint.config.mjs       # Config ESLint (core-web-vitals + typescript)
  postcss.config.mjs      # Config PostCSS (Tailwind)
```

## Convenciones Del Proyecto

- **Path alias**: `@/*` equivale a `./src/*`.
- **Idioma del codigo**: Nombres de variables, funciones, archivos y componentes en ingles. Documentacion y skills en espanol.
- **Idioma de documentacion**: Todo contenido documental (`SKILL.md`, `AGENTS.md`, `LORE.md`, comentarios de decision) en espanol claro.
- **Estilos**: Tailwind CSS 4 con `@import "tailwindcss"` en `globals.css`. No crear archivos CSS adicionales a menos que sea estrictamente necesario.
- **Componentes**: Server Components por defecto. Agregar `'use client'` solo cuando se requieran hooks, eventos o APIs del navegador.
- **TypeScript**: Modo strict activo. No usar `any` sin justificacion explicita.
- **ESLint**: Antes de entregar codigo, pasar `npm run lint`.
- **Build**: Antes de entregar codigo significativo, verificar que `npm run build` compila sin errores.
- **Stack de datos**: Supabase, Prisma y PostgreSQL son la base definida para datos y autenticacion.
- **Autenticacion futura**: Supabase Auth resolvera autenticacion; la autorizacion de negocio debe validar rol, autoria y asignacion por obra.

## Flujo De Trabajo Obligatorio

### Fase 1 — Comprension

1. **Leer la solicitud completa** sin asumir nada. Identificar el objetivo real, no solo la accion inmediata.
2. **Determinar el dominio afectado**: Si la tarea toca negocio, leer `LORE.md`. Si toca arquitectura, leer `myc-architecture`. Si toca ambos, leer ambos.
3. **Consultar las skills relevantes** segun `AGENTS.md`:
   - Negocio, roles, reglas funcionales -> `.agents/skills/myc-business/SKILL.md`
   - Arquitectura, entidades, flujos tecnicos -> `.agents/skills/myc-architecture/SKILL.md`
   - Reglas para modificar skills -> `.agents/skills/skills-rules/SKILL.md`
   - Supabase, Auth, RLS, migraciones o clientes -> `.agents/skills/supabase/SKILL.md`
   - PostgreSQL, esquemas, consultas, indices o RLS -> `.agents/skills/supabase-postgres-best-practices/SKILL.md`
4. **Identificar si la tarea requiere `next-best-practices`**: Si el cambio toca convenciones de Next.js, rutas, RSC, data fetching, metadata, imagenes, fuentes, manejo de errores o route handlers, consultar la skill `next-best-practices`.

### Fase 2 — Inspeccion

5. **Explorar la estructura actual** del area afectada. Leer archivos vecinos, `layout.tsx`, `page.tsx`, componentes relacionados.
6. **Detectar patrones existentes**: Como se nombran los archivos, como se exportan los componentes, como se importan dependencias, como se estructuran las carpetas, como se usa Tailwind, como se tipan las props.
7. **Verificar si ya existe una solucion similar** en el proyecto. No duplicar codigo, no crear nuevas abstracciones si ya hay un patron establecido.

### Fase 3 — Planeacion

8. **Planear el cambio antes de editar**: Definir que archivos se tocaran, que archivos se crearan, que imports se necesitan.
9. **Validar que el plan no rompe convenciones**: ¿Respeta la estructura de carpetas? ¿Usa el path alias `@/*`? ¿Sigue el patron de Server/Client Components? ¿Usa Tailwind en lugar de CSS nuevo?
10. **Cuestionar toda nueva dependencia, carpeta o abstraccion**: Solo crear una nueva carpeta (`components/`, `hooks/`, `lib/`, `services/`, `types/`) si el proyecto ya la usa o si el patron es claro y necesario. Si el proyecto esta en fase temprana y la carpeta no existe, preguntar al usuario antes de crearla.

### Fase 4 — Implementacion

11. **Hacer cambios minimos y coherentes**: Cada archivo modificado debe tener un proposito claro. No mezclar cambios no relacionados en un mismo archivo.
12. **Seguir la estructura de imports del proyecto**: Path alias `@/`, agrupar imports externos primero, luego internos.
13. **No inventar tipos, entidades, roles, estados ni flujos**: Todo debe estar respaldado por `LORE.md` o la estructura real del repositorio.
14. **No hardcodear secretos, URLs de produccion ni credenciales**.
15. **Respetar el vocabulario oficial del dominio** definido en `LORE.md`: roles (`super_admin`, `ingeniero`, `marketing`, `cliente`), estados de obra (`planeacion`, `en_progreso`, `en_pausa`, `completado`, `cancelado`), tipos de cliente (`persona`, `empresa`).
16. **Si el proyecto no tiene carpeta `src/components/` o similar, no crearla sin preguntar**: En fase temprana del proyecto, las decisiones de estructura deben ser explicitas.
17. **Si se implementa Supabase, Prisma o PostgreSQL en una tarea futura**: instalar dependencias solo con instruccion explicita, consultar las skills de Supabase, no crear esquemas ni clientes por anticipado y no tratar autenticacion como autorizacion suficiente.

### Fase 5 — Validacion

17. **Ejecutar `npm run lint`** despues de cada cambio significativo. Corregir todos los errores y warnings.
18. **Ejecutar `npm run build`** antes de entregar para verificar que no hay errores de compilacion TypeScript ni de Next.js.
19. **Verificar que no se rompieron imports**: Si se movieron o renombraron archivos, revisar que todas las referencias sigan validas.

### Fase 6 — Entrega

20. **Entregar un resumen claro** que incluya:
    - Archivos modificados o creados.
    - Validaciones ejecutadas y su resultado.
    - Decisiones tomadas y justificacion.
    - Riesgos o elementos pendientes.

## Checklist Antes De Editar

- [ ] Lei la solicitud completa y entendi el objetivo real.
- [ ] Consulte la documentacion relevante (`LORE.md`, skills del proyecto).
- [ ] Explore el area afectada del codigo.
- [ ] Detecte patrones existentes (nombres, estructura, imports, estilos).
- [ ] Verifique que no estoy duplicando codigo o patrones existentes.
- [ ] Planee los archivos a modificar/crear.
- [ ] El plan respeta las convenciones del proyecto.
- [ ] No estoy introduciendo dependencias innecesarias.

## Checklist Durante La Implementacion

- [ ] Cada cambio tiene un proposito claro y acotado.
- [ ] Uso el path alias `@/*` para imports internos.
- [ ] Los componentes son Server Components por defecto.
- [ ] Solo agrego `'use client'` cuando es estrictamente necesario.
- [ ] Uso Tailwind CSS; no creo archivos CSS adicionales sin justificacion.
- [ ] Respeto el modo strict de TypeScript; evito `any`.
- [ ] Nombres de variables, funciones y archivos en ingles.
- [ ] No hardcodeo secretos, URLs ni credenciales.
- [ ] No invento tipos, entidades, roles ni flujos sin respaldo en `LORE.md`.
- [ ] Sigo el vocabulario oficial del dominio.
- [ ] Si trabajo con Supabase, Prisma o PostgreSQL, diferencio dependencias instaladas de decisiones tecnicas futuras.

## Checklist Antes De Entregar

- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` compila sin errores.
- [ ] Todos los imports referencian archivos que existen.
- [ ] No hay codigo muerto, comentado ni de prueba.
- [ ] El cambio es minimal: no hice refactors fuera del alcance.
- [ ] Documente decisiones importantes si el cambio lo amerita.
- [ ] El resumen de entrega incluye archivos tocados, validaciones y riesgos.

## Reglas De Consistencia Estructural

- **Carpetas**: Solo crear `components/`, `hooks/`, `lib/`, `services/`, `types/` si el proyecto ya las usa o si el usuario lo solicita. En fase temprana, preguntar.
- **Archivos**: Seguir el patron de nomenclatura existente. Si los componentes usan `kebab-case` o `PascalCase`, mantenerlo. Si las rutas usan `[param]`, mantenerlo.
- **Exportaciones**: Usar el mismo estilo de exportacion que los archivos vecinos (`export default` vs `export` nombrado).
- **Props**: Tipar siempre las props de componentes con interfaces explicitas.
- **Estilos**: Tailwind con clases utilitarias. No mezclar CSS modules, styled-components ni otras soluciones sin decision explicita.

## Reglas Para Usar Documentacion Y Skills

- `LORE.md` es la fuente de verdad. Ninguna skill puede contradecirla.
- `AGENTS.md` define el orden de consulta. Seguirlo siempre.
- `myc-business` define reglas de negocio, roles y alcance funcional.
- `myc-architecture` define estructura tecnica, entidades y permisos.
- `skills-rules` define como modificar skills existentes.
- `next-best-practices` define convenciones tecnicas de Next.js.
- `supabase` define reglas operativas para tareas con Supabase, Auth, RLS, migraciones, clientes y configuracion.
- `supabase-postgres-best-practices` define buenas practicas para PostgreSQL, esquemas, consultas, indices, RLS y rendimiento.
- Si una skill no cubre el problema, consultar `LORE.md` directamente.

## Reglas Para Manejar Ambiguedad

- Si la solicitud del usuario es ambigua, preguntar antes de actuar. No asumir.
- Si la documentacion no cubre un aspecto, senalarlo explicitamente y pedir clarificacion.
- Si el codigo existente contradice la documentacion, reportar el conflicto y preguntar cual es la fuente de verdad actual.
- Si varias skills contienen informacion contradictoria, prevalecen en este orden: `LORE.md` > `AGENTS.md` > skills del proyecto > `next-best-practices` > buenas practicas generales.

## Reglas Para Manejar Conflictos

- **Documentacion vs codigo**: Reportar el conflicto. No resolverlo unilateralmente.
- **Skill vs LORE.md**: Prevalecen `LORE.md` y `AGENTS.md`.
- **Instruccion del usuario vs documentacion**: Seguir la instruccion del usuario solo si no contradice seguridad, integridad del proyecto o fuente de verdad.
- **next-best-practices vs convenciones del proyecto**: Prevalecen las convenciones observadas en el codigo del proyecto.

## Prevencion De Deuda Tecnica

- No introducir abstracciones prematuras. Crear carpetas, servicios o utilidades solo cuando el patron de uso sea claro.
- No copiar-pegar codigo sin entenderlo. Si se necesita reutilizar, extraer a una funcion o componente compartido.
- No usar `any` para evitar errores de TypeScript. Tipar correctamente.
- No dejar codigo comentado ni imports no usados.
- No agregar dependencias que no esten justificadas por la tarea.
- No hacer refactors masivos fuera del alcance de la tarea.
- No mezclar logicas de negocio con detalles de infraestructura en el mismo archivo.

## Errores Comunes Que El Agente Debe Evitar

1. **Editar sin leer**: Modificar archivos sin haber leido su contenido ni su contexto.
2. **Inventar estructura**: Crear carpetas como `src/components/` sin verificar si el proyecto ya tiene un patron definido.
3. **Asumir el stack**: Usar bibliotecas o patrones que no estan en `package.json`.
4. **Ignorar `LORE.md`**: Inventar roles, estados, entidades o flujos que no existen en la fuente de verdad.
5. **Sobreoptimizar**: Agregar abstracciones, servicios o capas que el proyecto no necesita en su fase actual.
6. **Romper el build**: Entregar codigo sin ejecutar `npm run build` o `npm run lint`.
7. **Usar `any`**: Evadir el sistema de tipos en lugar de definir interfaces correctas.
8. **Mezclar idiomas**: Escribir comentarios en ingles, variables en espanol, o viceversa. Mantener separacion clara.
9. **Hardcodear valores**: Dejar URLs, claves o configuraciones quemadas en el codigo.
10. **No entregar resumen**: Terminar cambios sin comunicar que se hizo, que se valido y que queda pendiente.
11. **Confundir autenticacion con autorizacion**: En futuras integraciones con Supabase Auth, validar tambien rol, autoria y asignacion por obra.

## Criterios De Finalizacion

Una tarea se considera completada cuando:

- [ ] Todos los cambios de codigo estan implementados.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` compila sin errores.
- [ ] El cambio es minimal y no contiene refactors fuera de alcance.
- [ ] Se respetaron las convenciones del proyecto.
- [ ] No se introdujo deuda tecnica evitable.
- [ ] Se entrego un resumen claro con archivos modificados, validaciones ejecutadas y riesgos pendientes.

## Scripts Disponibles

| Comando | Proposito |
|---|---|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Compilar para produccion (verifica TypeScript + Next.js) |
| `npm run start` | Iniciar servidor en modo produccion |
| `npm run lint` | Ejecutar ESLint |
| `npm run seed:admin` | Crear/actualizar usuario administrador en Supabase Auth |
| `npx prisma validate` | Validar esquema Prisma |
