-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase: Migración para sistema de emails Brevo & Artículos Libres
-- Ejecutar en: Dashboard → SQL Editor → New Query → Pegar → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Nuevas columnas en contratos
ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS estado               TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION'
    CHECK (estado IN ('PENDIENTE_REVISION', 'APROBADO', 'VENCIDO', 'RENOVADO')),
  ADD COLUMN IF NOT EXISTS fecha_aprobacion     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renovado             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aviso_2_meses_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aviso_1_mes_enviado   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aviso_7_dias_enviado  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS numero_acuerdo        TEXT;

-- 2. Columna email en clientes (si no existe)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Modificaciones para soportar Artículos / Combinaciones estructuradas (marca_id, calibre_id, linea)
ALTER TABLE contrato_aportes ALTER COLUMN articulo_id DROP NOT NULL;
ALTER TABLE contrato_aportes ADD COLUMN IF NOT EXISTS marca_id UUID REFERENCES marcas(id);
ALTER TABLE contrato_aportes ADD COLUMN IF NOT EXISTS calibre_id UUID REFERENCES calibres(id);
ALTER TABLE contrato_aportes ADD COLUMN IF NOT EXISTS linea TEXT;

ALTER TABLE contrato_descuentos ALTER COLUMN articulo_id DROP NOT NULL;
ALTER TABLE contrato_descuentos ADD COLUMN IF NOT EXISTS marca_id UUID REFERENCES marcas(id);
ALTER TABLE contrato_descuentos ADD COLUMN IF NOT EXISTS calibre_id UUID REFERENCES calibres(id);
ALTER TABLE contrato_descuentos ADD COLUMN IF NOT EXISTS linea TEXT;

-- 4. Generar numero_acuerdo para contratos existentes (usando CTE y NOW() ya que created_at no existe)
WITH numerados AS (
  SELECT id, 'AC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::TEXT, 4, '0') AS num
  FROM contratos
  WHERE numero_acuerdo IS NULL
)
UPDATE contratos
SET numero_acuerdo = numerados.num
FROM numerados
WHERE contratos.id = numerados.id;

-- 5. Índice para consultas de vencimiento
CREATE INDEX IF NOT EXISTS idx_contratos_vencimiento
  ON contratos (fecha_vencimiento)
  WHERE renovado = FALSE AND estado = 'APROBADO';

-- 6. Función de recordatorios (usa cl.email del JOIN con clientes)
CREATE OR REPLACE FUNCTION contratos_para_recordatorio()
RETURNS TABLE (
  id                UUID,
  cliente_nombre    TEXT,
  cliente_email     TEXT,
  numero_acuerdo    TEXT,
  fecha_vencimiento DATE,
  tipo_aviso        TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    cl.nombre                                        AS cliente_nombre,
    COALESCE(cl.email, '')                           AS cliente_email,
    COALESCE(c.numero_acuerdo, 'AC-' || c.id::TEXT) AS numero_acuerdo,
    c.fecha_vencimiento,
    CASE
      WHEN c.fecha_vencimiento = CURRENT_DATE + INTERVAL '60 days'
           AND c.aviso_2_meses_enviado = FALSE THEN 'DOS_MESES'
      WHEN c.fecha_vencimiento = CURRENT_DATE + INTERVAL '30 days'
           AND c.aviso_1_mes_enviado = FALSE  THEN 'UN_MES'
      WHEN c.fecha_vencimiento = CURRENT_DATE + INTERVAL '7 days'
           AND c.aviso_7_dias_enviado = FALSE THEN 'SIETE_DIAS'
    END AS tipo_aviso
  FROM contratos c
  LEFT JOIN clientes cl ON cl.id = c.cliente_id
  WHERE
    c.estado = 'APROBADO'
    AND c.renovado = FALSE
    AND c.fecha_vencimiento IS NOT NULL
    AND (
      (c.fecha_vencimiento = CURRENT_DATE + INTERVAL '60 days' AND c.aviso_2_meses_enviado = FALSE)
      OR (c.fecha_vencimiento = CURRENT_DATE + INTERVAL '30 days' AND c.aviso_1_mes_enviado = FALSE)
      OR (c.fecha_vencimiento = CURRENT_DATE + INTERVAL '7 days'  AND c.aviso_7_dias_enviado = FALSE)
    );
$$;

-- 7. Función para marcar contratos vencidos
CREATE OR REPLACE FUNCTION marcar_contratos_vencidos()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE contratos
  SET estado = 'VENCIDO'
  WHERE fecha_vencimiento < CURRENT_DATE
    AND estado NOT IN ('VENCIDO', 'RENOVADO');
$$;
