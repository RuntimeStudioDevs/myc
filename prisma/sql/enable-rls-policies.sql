-- ============================================================
-- MYC — Row Level Security Policies
-- ============================================================
-- Activa RLS en todas las tablas del schema public y define
-- politicas de acceso alineadas con la matriz de permisos
-- implementada en el codigo.
--
-- Principios:
--   - super_admin: acceso completo a todas las tablas.
--   - ingeniero / marketing: acceso solo a datos de obras
--     donde tienen asignacion activa (desasignado_en IS NULL).
--   - cliente: acceso solo a datos de sus propias obras.
--   - Usuarios inactivos (activo = false): sin acceso.
--   - Soft delete respetado: eliminado_en IS NULL.
--   - Solo politicas SELECT para roles anon/authenticated.
--     Las mutaciones ocurren via Server Actions con rol postgres
--     que bypass RLS.
--   - Helper functions como SECURITY INVOKER (el default).
--     La funcion sync_auth_user_profile existente se mantiene
--     como SECURITY DEFINER (requerido para el trigger en auth).
--
-- PRECAUCION: Prisma se conecta via DATABASE_URL con rol
-- postgres (Session Pooler), que tiene BYPASSRLS. Las
-- operaciones server-side no se ven afectadas por RLS.
--
-- Ejecutar en: Supabase SQL Editor o supabase db query
-- ============================================================

-- ============================================================
-- HELPER: verificar si el usuario autenticado es super_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.myc_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = (SELECT auth.uid())
      AND rol = 'super_admin'
      AND activo = true
      AND eliminado_en IS NULL
  );
$$;

-- ============================================================
-- HELPER: verificar si el usuario autenticado esta activo
-- ============================================================
CREATE OR REPLACE FUNCTION public.myc_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = (SELECT auth.uid())
      AND activo = true
      AND eliminado_en IS NULL
  );
$$;

-- ============================================================
-- HELPER: verificar acceso a una obra para el usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION public.myc_can_access_project(p_obra_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  v_rol public.rol_usuario;
  v_cliente_id uuid;
BEGIN
  -- Obtener rol del usuario actual
  SELECT u.rol INTO v_rol
  FROM public.usuarios u
  WHERE u.id = (SELECT auth.uid())
    AND u.activo = true
    AND u.eliminado_en IS NULL;

  -- Usuario no encontrado o inactivo
  IF v_rol IS NULL THEN
    RETURN false;
  END IF;

  -- super_admin: acceso total
  IF v_rol = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Cliente: acceso si la obra es de su cliente
  IF v_rol = 'cliente' THEN
    SELECT c.id INTO v_cliente_id
    FROM public.clientes c
    WHERE c.usuario_id = (SELECT auth.uid())
      AND c.eliminado_en IS NULL;

    IF v_cliente_id IS NULL THEN
      RETURN false;
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = p_obra_id
        AND o.cliente_id = v_cliente_id
        AND o.eliminado_en IS NULL
    );
  END IF;

  -- Ingeniero o marketing: acceso si tiene asignacion activa
  RETURN EXISTS (
    SELECT 1 FROM public.asignaciones_obra ao
    WHERE ao.obra_id = p_obra_id
      AND ao.usuario_id = (SELECT auth.uid())
      AND ao.desasignado_en IS NULL
  );
END;
$$;

-- ============================================================
-- HELPER: verificar acceso a una actualizacion (via su obra)
-- ============================================================
CREATE OR REPLACE FUNCTION public.myc_can_access_update(p_update_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT public.myc_can_access_project(
    (SELECT obra_id FROM public.actualizaciones_obra WHERE id = p_update_id)
  );
$$;

-- ============================================================
-- HELPER: verificar que el usuario es cliente dueno de una obra
-- ============================================================
CREATE OR REPLACE FUNCTION public.myc_is_client_of_project(p_obra_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.obras o
    JOIN public.clientes c ON c.id = o.cliente_id
    WHERE o.id = p_obra_id
      AND c.usuario_id = auth.uid()
      AND c.eliminado_en IS NULL
      AND o.eliminado_en IS NULL
  );
$$;

-- ============================================================
-- ACTIVAR RLS EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actualizaciones_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos_actualizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archivos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_estado_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_actualizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_obra ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLITICAS: public.usuarios
-- ============================================================

-- Cada usuario puede leer su propio perfil
DROP POLICY IF EXISTS "usuarios_select_self" ON public.usuarios;
CREATE POLICY "usuarios_select_self" ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    AND activo = true
    AND eliminado_en IS NULL
  );

-- super_admin puede leer todos los usuarios
DROP POLICY IF EXISTS "usuarios_select_admin" ON public.usuarios;
CREATE POLICY "usuarios_select_admin" ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Staff y clientes pueden ver datos basicos de usuarios
-- relacionados con sus obras (nombre, email, rol)
DROP POLICY IF EXISTS "usuarios_select_related" ON public.usuarios;
CREATE POLICY "usuarios_select_related" ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND id <> (SELECT auth.uid())
    AND EXISTS (
      -- usuarios que comparten al menos una asignacion activa
      -- con el usuario actual, o el cliente dueno de una obra
      -- donde el usuario actual esta asignado
      SELECT 1 FROM public.asignaciones_obra ao1
      JOIN public.asignaciones_obra ao2
        ON ao2.obra_id = ao1.obra_id
        AND ao2.usuario_id = (SELECT auth.uid())
        AND ao2.desasignado_en IS NULL
      WHERE ao1.usuario_id = public.usuarios.id
        AND ao1.desasignado_en IS NULL
      UNION
      SELECT 1 FROM public.obras o
      JOIN public.clientes c ON c.id = o.cliente_id
      WHERE o.id IN (
        SELECT obra_id FROM public.asignaciones_obra
        WHERE usuario_id = (SELECT auth.uid())
          AND desasignado_en IS NULL
      )
      AND c.usuario_id = public.usuarios.id
      AND c.eliminado_en IS NULL
      UNION
      SELECT 1 FROM public.clientes c
      JOIN public.obras o ON o.cliente_id = c.id
      WHERE c.usuario_id = (SELECT auth.uid())
        AND c.eliminado_en IS NULL
        AND o.id IN (
          SELECT obra_id FROM public.asignaciones_obra
          WHERE usuario_id = public.usuarios.id
            AND desasignado_en IS NULL
        )
    )
  );

-- ============================================================
-- POLITICAS: public.clientes
-- ============================================================

-- Cliente puede leer su propio registro
DROP POLICY IF EXISTS "clientes_select_self" ON public.clientes;
CREATE POLICY "clientes_select_self" ON public.clientes
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = (SELECT auth.uid())
    AND eliminado_en IS NULL
  );

-- super_admin puede leer todos
DROP POLICY IF EXISTS "clientes_select_admin" ON public.clientes;
CREATE POLICY "clientes_select_admin" ON public.clientes
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Staff puede leer clientes de obras donde tiene asignacion
DROP POLICY IF EXISTS "clientes_select_staff" ON public.clientes;
CREATE POLICY "clientes_select_staff" ON public.clientes
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND EXISTS (
      SELECT 1 FROM public.obras o
      JOIN public.asignaciones_obra ao
        ON ao.obra_id = o.id
        AND ao.usuario_id = (SELECT auth.uid())
        AND ao.desasignado_en IS NULL
      WHERE o.cliente_id = public.clientes.id
        AND o.eliminado_en IS NULL
    )
  );

-- ============================================================
-- POLITICAS: public.obras
-- ============================================================

-- super_admin: todas las obras
DROP POLICY IF EXISTS "obras_select_admin" ON public.obras;
CREATE POLICY "obras_select_admin" ON public.obras
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Cliente: solo obras de su cliente, no eliminadas
DROP POLICY IF EXISTS "obras_select_client" ON public.obras;
CREATE POLICY "obras_select_client" ON public.obras
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = public.obras.cliente_id
        AND c.usuario_id = (SELECT auth.uid())
        AND c.eliminado_en IS NULL
    )
    AND eliminado_en IS NULL
  );

-- Staff: solo obras con asignacion activa, no eliminadas
DROP POLICY IF EXISTS "obras_select_staff" ON public.obras;
CREATE POLICY "obras_select_staff" ON public.obras
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND EXISTS (
      SELECT 1 FROM public.asignaciones_obra ao
      WHERE ao.obra_id = public.obras.id
        AND ao.usuario_id = (SELECT auth.uid())
        AND ao.desasignado_en IS NULL
    )
    AND eliminado_en IS NULL
  );

-- ============================================================
-- POLITICAS: public.asignaciones_obra
-- ============================================================

-- super_admin: todas
DROP POLICY IF EXISTS "asignaciones_select_admin" ON public.asignaciones_obra;
CREATE POLICY "asignaciones_select_admin" ON public.asignaciones_obra
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra pueden ver sus asignaciones
DROP POLICY IF EXISTS "asignaciones_select_access" ON public.asignaciones_obra;
CREATE POLICY "asignaciones_select_access" ON public.asignaciones_obra
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_project(obra_id)
  );

-- ============================================================
-- POLITICAS: public.actualizaciones_obra
-- ============================================================

-- super_admin: todas
DROP POLICY IF EXISTS "actualizaciones_select_admin" ON public.actualizaciones_obra;
CREATE POLICY "actualizaciones_select_admin" ON public.actualizaciones_obra
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra, solo no eliminadas
DROP POLICY IF EXISTS "actualizaciones_select_access" ON public.actualizaciones_obra;
CREATE POLICY "actualizaciones_select_access" ON public.actualizaciones_obra
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_project(obra_id)
    AND eliminado_en IS NULL
  );

-- ============================================================
-- POLITICAS: public.archivos_actualizacion
-- ============================================================

-- super_admin: todos
DROP POLICY IF EXISTS "archivos_act_select_admin" ON public.archivos_actualizacion;
CREATE POLICY "archivos_act_select_admin" ON public.archivos_actualizacion
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra de la actualizacion
DROP POLICY IF EXISTS "archivos_act_select_access" ON public.archivos_actualizacion;
CREATE POLICY "archivos_act_select_access" ON public.archivos_actualizacion
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_update(actualizacion_id)
  );

-- ============================================================
-- POLITICAS: public.archivos_obra
-- ============================================================

-- super_admin: todos
DROP POLICY IF EXISTS "archivos_obra_select_admin" ON public.archivos_obra;
CREATE POLICY "archivos_obra_select_admin" ON public.archivos_obra
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra, solo no eliminados
DROP POLICY IF EXISTS "archivos_obra_select_access" ON public.archivos_obra;
CREATE POLICY "archivos_obra_select_access" ON public.archivos_obra
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_project(obra_id)
    AND eliminado_en IS NULL
  );

-- ============================================================
-- POLITICAS: public.historial_estado_obra
-- ============================================================

-- super_admin: todo
DROP POLICY IF EXISTS "historial_select_admin" ON public.historial_estado_obra;
CREATE POLICY "historial_select_admin" ON public.historial_estado_obra
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra
DROP POLICY IF EXISTS "historial_select_access" ON public.historial_estado_obra;
CREATE POLICY "historial_select_access" ON public.historial_estado_obra
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_project(obra_id)
  );

-- ============================================================
-- POLITICAS: public.comentarios_actualizacion
-- ============================================================

-- super_admin: todos
DROP POLICY IF EXISTS "comentarios_act_select_admin" ON public.comentarios_actualizacion;
CREATE POLICY "comentarios_act_select_admin" ON public.comentarios_actualizacion
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra de la actualizacion, solo no eliminados
DROP POLICY IF EXISTS "comentarios_act_select_access" ON public.comentarios_actualizacion;
CREATE POLICY "comentarios_act_select_access" ON public.comentarios_actualizacion
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_update(actualizacion_id)
    AND eliminado_en IS NULL
  );

-- ============================================================
-- POLITICAS: public.comentarios_obra
-- ============================================================

-- super_admin: todos
DROP POLICY IF EXISTS "comentarios_obra_select_admin" ON public.comentarios_obra;
CREATE POLICY "comentarios_obra_select_admin" ON public.comentarios_obra
  FOR SELECT
  TO authenticated
  USING (public.myc_is_super_admin());

-- Usuarios con acceso a la obra, solo no eliminados
DROP POLICY IF EXISTS "comentarios_obra_select_access" ON public.comentarios_obra;
CREATE POLICY "comentarios_obra_select_access" ON public.comentarios_obra
  FOR SELECT
  TO authenticated
  USING (
    public.myc_is_active()
    AND public.myc_can_access_project(obra_id)
    AND eliminado_en IS NULL
  );
