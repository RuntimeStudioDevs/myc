-- ============================================================
-- MYC — Foreign Key Indexes
-- ============================================================
-- Agrega indices en columnas FK y columnas de filtro frecuente
-- para optimizar las consultas del sistema.
--
-- Principios:
--   - Idempotente: usa CREATE INDEX IF NOT EXISTS.
--   - Sin duplicados: indices compuestos cubren sus prefijos.
--   - Alineado con queries reales en src/lib/projects/.
--   - Alineado con politicas RLS en enable-rls-policies.sql.
--   - No modifica datos, estructura ni politicas.
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. clientes — FK y filtros
-- ============================================================

-- FK: creado_por → usuarios.id
CREATE INDEX IF NOT EXISTS idx_clientes_creado_por
  ON public.clientes (creado_por);

-- Filtro frecuente: eliminado_en (soft delete)
CREATE INDEX IF NOT EXISTS idx_clientes_eliminado_en
  ON public.clientes (eliminado_en)
  WHERE eliminado_en IS NULL;

-- ============================================================
-- 2. obras — FK, filtros y ordenamiento
-- ============================================================

-- FK + filtro: cliente_id + eliminado_en (listClientProjects)
CREATE INDEX IF NOT EXISTS idx_obras_cliente_id_eliminado
  ON public.obras (cliente_id, eliminado_en);

-- FK: creado_por → usuarios.id
CREATE INDEX IF NOT EXISTS idx_obras_creado_por
  ON public.obras (creado_por);

-- FK: actualizado_por → usuarios.id
CREATE INDEX IF NOT EXISTS idx_obras_actualizado_por
  ON public.obras (actualizado_por);

-- Filtro + orden: listado general (admin), RLS staff
CREATE INDEX IF NOT EXISTS idx_obras_eliminado_creado
  ON public.obras (eliminado_en, creado_en DESC);

-- ============================================================
-- 3. asignaciones_obra — FK, permisos y RLS
-- ============================================================

-- FK + filtro activo + FK: obra_id, usuario_id, desasignado_en
-- Cubre: canAccessProject, RLS, hasActiveProjectAssignment
CREATE INDEX IF NOT EXISTS idx_asignaciones_obra_proyecto_usuario
  ON public.asignaciones_obra (obra_id, usuario_id, desasignado_en);

-- FK + filtro activo: usuario_id, desasignado_en, obra_id
-- Cubre: listProjects (subquery), RLS staff, getAssignmentFilter
CREATE INDEX IF NOT EXISTS idx_asignaciones_usuario_activas
  ON public.asignaciones_obra (usuario_id, desasignado_en, obra_id);

-- ============================================================
-- 4. actualizaciones_obra — FK, filtros y ordenamiento
-- ============================================================

-- FK + filtro + orden: listProjectUpdates, RLS
CREATE INDEX IF NOT EXISTS idx_actualizaciones_obra_filtro
  ON public.actualizaciones_obra (obra_id, eliminado_en, creado_en DESC);

-- FK: autor_id → usuarios.id
-- Usado en: canEditProjectUpdate, permisos de autoria
CREATE INDEX IF NOT EXISTS idx_actualizaciones_autor_id
  ON public.actualizaciones_obra (autor_id);

-- ============================================================
-- 5. archivos_actualizacion — FK
-- ============================================================

-- FK: actualizacion_id → actualizaciones_obra.id
CREATE INDEX IF NOT EXISTS idx_archivos_act_actualizacion_id
  ON public.archivos_actualizacion (actualizacion_id);

-- ============================================================
-- 6. archivos_obra — FK, filtros
-- ============================================================

-- FK + filtro: listProjectFiles, RLS
CREATE INDEX IF NOT EXISTS idx_archivos_obra_proyecto_eliminado
  ON public.archivos_obra (obra_id, eliminado_en);

-- FK: subido_por → usuarios.id
CREATE INDEX IF NOT EXISTS idx_archivos_obra_subido_por
  ON public.archivos_obra (subido_por);

-- ============================================================
-- 7. historial_estado_obra — FK, filtros y ordenamiento
-- ============================================================

-- FK + orden: getProjectStatusHistory, RLS
CREATE INDEX IF NOT EXISTS idx_historial_obra_id_creado
  ON public.historial_estado_obra (obra_id, creado_en DESC);

-- FK: cambiado_por → usuarios.id
CREATE INDEX IF NOT EXISTS idx_historial_cambiado_por
  ON public.historial_estado_obra (cambiado_por);

-- FK opcional: actualizacion_id_relacionada
CREATE INDEX IF NOT EXISTS idx_historial_actualizacion_id
  ON public.historial_estado_obra (actualizacion_id_relacionada);

-- ============================================================
-- 8. comentarios_actualizacion — FK, filtros y ordenamiento
-- ============================================================

-- FK + filtro + orden: listUpdateComments, RLS
CREATE INDEX IF NOT EXISTS idx_comentarios_act_filtro
  ON public.comentarios_actualizacion (actualizacion_id, eliminado_en, creado_en ASC);

-- FK: autor_id → usuarios.id
-- Usado en: canEditUpdateComment, permisos de autoria
CREATE INDEX IF NOT EXISTS idx_comentarios_act_autor_id
  ON public.comentarios_actualizacion (autor_id);

-- ============================================================
-- 9. comentarios_obra — FK, filtros y ordenamiento
-- ============================================================

-- FK + filtro + orden: listProjectComments, RLS
CREATE INDEX IF NOT EXISTS idx_comentarios_obra_filtro
  ON public.comentarios_obra (obra_id, eliminado_en, creado_en ASC);

-- FK: autor_id → usuarios.id
-- Usado en: canEditProjectComment, permisos de autoria
CREATE INDEX IF NOT EXISTS idx_comentarios_obra_autor_id
  ON public.comentarios_obra (autor_id);

-- ============================================================
-- 10. usuarios — filtros de rol y estado
-- ============================================================

-- Filtro: listActiveEngineers, RLS helpers
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_activo
  ON public.usuarios (rol, activo, eliminado_en);
