-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase: Migración para Subcategorías de Líneas y Combinaciones Estructuradas
-- Ejecutar en: Dashboard → SQL Editor → New Query → Pegar → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Crear tabla de Líneas (Subcategoría de Marcas)
CREATE TABLE IF NOT EXISTS lineas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  marca_id UUID REFERENCES marcas(id) ON DELETE CASCADE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nombre, marca_id)
);

-- 2. Insertar líneas/subcategorías de ejemplo para las marcas existentes
INSERT INTO lineas (nombre, marca_id)
SELECT 'Lager', id FROM marcas WHERE nombre = 'Zillertal'
ON CONFLICT DO NOTHING;
INSERT INTO lineas (nombre, marca_id)
SELECT 'Doble Lúpulo', id FROM marcas WHERE nombre = 'Zillertal'
ON CONFLICT DO NOTHING;

INSERT INTO lineas (nombre, marca_id)
SELECT 'Lager', id FROM marcas WHERE nombre = 'Stella Artois'
ON CONFLICT DO NOTHING;
INSERT INTO lineas (nombre, marca_id)
SELECT 'Noire', id FROM marcas WHERE nombre = 'Stella Artois'
ON CONFLICT DO NOTHING;

INSERT INTO lineas (nombre, marca_id)
SELECT 'Extra', id FROM marcas WHERE nombre = 'Corona'
ON CONFLICT DO NOTHING;

INSERT INTO lineas (nombre, marca_id)
SELECT 'Amber Lager', id FROM marcas WHERE nombre = 'Patagonia'
ON CONFLICT DO NOTHING;
INSERT INTO lineas (nombre, marca_id)
SELECT 'Bohemian Pilsen', id FROM marcas WHERE nombre = 'Patagonia'
ON CONFLICT DO NOTHING;
INSERT INTO lineas (nombre, marca_id)
SELECT 'Weisse', id FROM marcas WHERE nombre = 'Patagonia'
ON CONFLICT DO NOTHING;

-- 3. Modificaciones a las tablas de relación para soportar linea_id y codigo_interno
ALTER TABLE contrato_aportes DROP COLUMN IF EXISTS linea;
ALTER TABLE contrato_aportes ADD COLUMN IF NOT EXISTS linea_id UUID REFERENCES lineas(id);
ALTER TABLE contrato_aportes ADD COLUMN IF NOT EXISTS codigo_interno TEXT;

ALTER TABLE contrato_descuentos DROP COLUMN IF EXISTS linea;
ALTER TABLE contrato_descuentos ADD COLUMN IF NOT EXISTS linea_id UUID REFERENCES lineas(id);
ALTER TABLE contrato_descuentos ADD COLUMN IF NOT EXISTS codigo_interno TEXT;
