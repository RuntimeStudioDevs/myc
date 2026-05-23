-- ============================================================
-- MYC — Migración inicial
-- ============================================================
-- Generada con: prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script
-- Crea el esquema public con 10 tablas, 6 enums y todas las FKs.
-- No modifica auth.users (gestionado por Supabase).
-- ============================================================

-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('super_admin', 'ingeniero', 'marketing', 'cliente');

-- CreateEnum
CREATE TYPE "tipo_cliente" AS ENUM ('persona', 'empresa');

-- CreateEnum
CREATE TYPE "estado_obra" AS ENUM ('planeacion', 'en_progreso', 'en_pausa', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "rol_asignacion" AS ENUM ('ingeniero', 'marketing');

-- CreateEnum
CREATE TYPE "tipo_archivo_actualizacion" AS ENUM ('foto', 'video');

-- CreateEnum
CREATE TYPE "tipo_archivo_obra" AS ENUM ('foto', 'documento', 'pdf', 'otro');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "rol_usuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "tipo_cliente" "tipo_cliente" NOT NULL,
    "nombre_mostrar" TEXT NOT NULL,
    "telefono" TEXT,
    "documento" TEXT,
    "direccion" TEXT,
    "usuario_id" UUID NOT NULL,
    "creado_por" UUID NOT NULL,
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado_actual" "estado_obra" NOT NULL DEFAULT 'planeacion',
    "progreso_actual" INTEGER NOT NULL DEFAULT 0,
    "fecha_inicio" TIMESTAMP(3),
    "fecha_fin_estimada" TIMESTAMP(3),
    "archivada_en" TIMESTAMP(3),
    "creado_por" UUID NOT NULL,
    "actualizado_por" UUID,
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_obra" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rol_asignacion" "rol_asignacion" NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "asignado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desasignado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actualizaciones_obra" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_efectiva" TIMESTAMP(3),
    "estado_resultante_opcional" "estado_obra",
    "progreso_resultante_opcional" INTEGER,
    "editado_en" TIMESTAMP(3),
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actualizaciones_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_actualizacion" (
    "id" UUID NOT NULL,
    "actualizacion_id" UUID NOT NULL,
    "tipo_archivo" "tipo_archivo_actualizacion" NOT NULL,
    "url" TEXT NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_actualizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_obra" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "subido_por" UUID NOT NULL,
    "tipo_archivo" "tipo_archivo_obra" NOT NULL,
    "url" TEXT NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estado_obra" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "estado_anterior" "estado_obra",
    "estado_nuevo" "estado_obra",
    "progreso_anterior" INTEGER,
    "progreso_nuevo" INTEGER,
    "cambiado_por" UUID NOT NULL,
    "observacion" TEXT,
    "actualizacion_id_relacionada" UUID,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_actualizacion" (
    "id" UUID NOT NULL,
    "actualizacion_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado_en" TIMESTAMP(3),
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_actualizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_obra" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "editado_en" TIMESTAMP(3),
    "eliminado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_obra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_usuario_id_key" ON "clientes"("usuario_id");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_obra" ADD CONSTRAINT "asignaciones_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_obra" ADD CONSTRAINT "asignaciones_obra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actualizaciones_obra" ADD CONSTRAINT "actualizaciones_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actualizaciones_obra" ADD CONSTRAINT "actualizaciones_obra_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_actualizacion" ADD CONSTRAINT "archivos_actualizacion_actualizacion_id_fkey" FOREIGN KEY ("actualizacion_id") REFERENCES "actualizaciones_obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_obra" ADD CONSTRAINT "archivos_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_obra" ADD CONSTRAINT "archivos_obra_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_obra" ADD CONSTRAINT "historial_estado_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_obra" ADD CONSTRAINT "historial_estado_obra_cambiado_por_fkey" FOREIGN KEY ("cambiado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_obra" ADD CONSTRAINT "historial_estado_obra_actualizacion_id_relacionada_fkey" FOREIGN KEY ("actualizacion_id_relacionada") REFERENCES "actualizaciones_obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_actualizacion" ADD CONSTRAINT "comentarios_actualizacion_actualizacion_id_fkey" FOREIGN KEY ("actualizacion_id") REFERENCES "actualizaciones_obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_actualizacion" ADD CONSTRAINT "comentarios_actualizacion_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_obra" ADD CONSTRAINT "comentarios_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_obra" ADD CONSTRAINT "comentarios_obra_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
