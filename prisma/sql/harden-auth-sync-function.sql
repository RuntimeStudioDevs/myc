-- ============================================================
-- MYC -- Endurecimiento de sync_auth_user_profile()
-- ============================================================
-- Mueve la funcion sync_auth_user_profile() del schema public
-- al schema privado myc_internal para eliminar la exposicion
-- via RPC. Revoca permisos de ejecucion para anon,
-- authenticated y PUBLIC. Actualiza el trigger en auth.users
-- para que use la funcion en myc_internal.
--
-- Idempotente: se puede re-ejecutar sin efectos secundarios.
--
-- Ejecutar DESPUES de sync-auth-users-profile.sql.
-- ============================================================

-- ============================================================
-- 1. Crear schema privado (si no existe)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS myc_internal;

-- ============================================================
-- 2. Otorgar USAGE a supabase_auth_admin
--    El trigger en auth.users se ejecuta como supabase_auth_admin
--    (owner de la tabla auth.users). Necesita USAGE en
--    myc_internal para resolver la funcion. Sin este GRANT,
--    el trigger fallaria al buscar myc_internal.sync_auth_user_profile().
-- ============================================================
GRANT USAGE ON SCHEMA myc_internal TO supabase_auth_admin;

-- ============================================================
-- 3. Crear la funcion en myc_internal
--    Misma logica que la original, mismo search_path = '' (seguro),
--    mismos parametros SECURITY DEFINER (necesario para que el
--    trigger pueda insertar en public.usuarios desde el contexto
--    de supabase_auth_admin).
-- ============================================================
CREATE OR REPLACE FUNCTION myc_internal.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usuarios (
    id,
    nombre,
    email,
    rol,
    activo,
    creado_en,
    actualizado_en
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'cliente',
    TRUE,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Actualizar el trigger para que use la funcion nueva
-- ============================================================
DROP TRIGGER IF EXISTS tr_sync_auth_user_profile ON auth.users;
CREATE TRIGGER tr_sync_auth_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION myc_internal.sync_auth_user_profile();

-- ============================================================
-- 5. Revocar permisos de ejecucion de la funcion nueva
--    La funcion esta en schema privado, pero por defensa en
--    profundidad revocamos explicitamente.
-- ============================================================
REVOKE ALL ON FUNCTION myc_internal.sync_auth_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION myc_internal.sync_auth_user_profile() FROM anon;
REVOKE ALL ON FUNCTION myc_internal.sync_auth_user_profile() FROM authenticated;

-- ============================================================
-- 6. Revocar permisos de la funcion vieja en public
--    Se conserva la funcion vieja (no se borra) pero se le
--    revocan todos los permisos por si algun proceso externo
--    intenta invocarla via RPC.
-- ============================================================
REVOKE ALL ON FUNCTION public.sync_auth_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_auth_user_profile() FROM anon;
REVOKE ALL ON FUNCTION public.sync_auth_user_profile() FROM authenticated;
