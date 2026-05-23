-- ============================================================
-- MYC — Sincronización auth.users → public.usuarios
-- ============================================================
-- Trigger que crea automáticamente un perfil de dominio en
-- public.usuarios cada vez que Supabase Auth inserta un nuevo
-- usuario en auth.users.
--
-- Decisiones de diseño:
--   - Rol por defecto: 'cliente'. Es el valor mas seguro para
--     cuentas creadas via registro publico. Los usuarios internos
--     (super_admin, ingeniero, marketing) deben crearse con rol
--     'cliente' inicialmente y luego actualizar su rol manualmente
--     desde Supabase Dashboard o mediante una accion administrativa.
--   - nombre: toma el valor de raw_user_meta_data.name si existe
--     (enviado en el signUp). Si no, usa el prefijo del email.
--   - email: se copia directamente de auth.users.email.
--   - id: mismo UUID que auth.users.id (PK compartida).
--   - activo: true por defecto.
--   - La FK fk_usuarios_auth_users debe existir antes de ejecutar
--     este script (ver fk-usuarios-auth-users.sql).
--
-- Ejecutar DESPUES de:
--   1. Migracion inicial (crea public.usuarios)
--   2. fk-usuarios-auth-users.sql (FK de usuarios a auth.users)
-- ============================================================

-- Funcion que se ejecuta al insertar en auth.users
CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
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

-- Trigger: se dispara despues de cada INSERT en auth.users
DROP TRIGGER IF EXISTS tr_sync_auth_user_profile ON auth.users;
CREATE TRIGGER tr_sync_auth_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_profile();
