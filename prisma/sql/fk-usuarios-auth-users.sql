-- ============================================================
-- MYC — FK de usuarios a auth.users
-- ============================================================
-- Aplica la FK desde public.usuarios.id hacia auth.users.id.
-- Esto garantiza que cada perfil de dominio tenga un usuario
-- autenticado correspondiente en Supabase Auth.
--
-- Ejecutar DESPUES de la migracion inicial.
-- ============================================================

ALTER TABLE "public"."usuarios"
  ADD CONSTRAINT "fk_usuarios_auth_users"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
  ON DELETE CASCADE;
