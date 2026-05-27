-- ============================================================
-- MYC — Enable Supabase Realtime Publication
-- ============================================================
-- Agrega las tablas del dominio a la publicacion supabase_realtime
-- para que los cambios (INSERT, UPDATE, DELETE) se transmitan
-- via WebSocket a los clientes suscritos.
--
-- Seguridad: RLS permanece activo. Los clientes solo reciben
-- notificaciones de cambios en tablas donde tienen politicas
-- SELECT. El payload no se usa para renderizar — solo como
-- senal para router.refresh(), que re-ejecuta las queries
-- server-side con todas las validaciones de permisos.
--
-- Idempotente: ALTER PUBLICATION ... ADD TABLE no falla si la
-- tabla ya esta en la publicacion (PostgreSQL ignora duplicados
-- en publicaciones).
--
-- Ejecutar en: Supabase SQL Editor o supabase db query
-- ============================================================

-- Tablas principales con obra_id directo
ALTER PUBLICATION supabase_realtime ADD TABLE public.obras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.actualizaciones_obra;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios_obra;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archivos_obra;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historial_estado_obra;

-- Tablas dependientes (sin obra_id directo, asociadas via actualizacion_id)
ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios_actualizacion;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archivos_actualizacion;
