-- ============================================================
-- Gestiona Cobros — Esquema de base de datos
-- Tablas: clientes, pagos, configuracion
-- Seguridad: Row Level Security (solo usuarios autenticados)
-- ============================================================

-- ── CLIENTES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clientes (
  id                  TEXT PRIMARY KEY,
  nombre              TEXT NOT NULL,
  telefono            TEXT NOT NULL DEFAULT '',
  cantidad_sistemas   INTEGER NOT NULL DEFAULT 1,
  monto_cuota         NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo               NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago         TEXT NOT NULL DEFAULT '',
  estado              TEXT NOT NULL DEFAULT 'al-dia'
                        CHECK (estado IN ('pendiente', 'vencido', 'al-dia')),
  mensaje_vencimiento TEXT,
  mensaje_pago_pendiente TEXT,
  fecha_vencimiento   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PAGOS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pagos (
  id               TEXT PRIMARY KEY,
  cliente_id       TEXT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cliente_nombre   TEXT NOT NULL,
  monto            NUMERIC(12,2) NOT NULL,
  monto_original   NUMERIC(12,2) NOT NULL,
  descuento        NUMERIC(5,2) NOT NULL DEFAULT 0,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alias            TEXT NOT NULL DEFAULT '',
  tipo             TEXT NOT NULL CHECK (tipo IN ('total', 'parcial')),
  es_cuota_mensual BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_cliente_id ON public.pagos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON public.pagos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);

-- ── CONFIGURACIÓN (fila única, id = 1) ────────────────────
CREATE TABLE IF NOT EXISTS public.configuracion (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  valor_sistema     NUMERIC(12,2) NOT NULL DEFAULT 12500,
  valor_sistema_usd NUMERIC(12,4) NOT NULL DEFAULT 10,
  cotizacion_usd    NUMERIC(12,2) NOT NULL DEFAULT 1200,
  alias_cobranza    TEXT NOT NULL DEFAULT '',
  alias2_cobranza   TEXT NOT NULL DEFAULT '',
  mensaje_vencido   TEXT NOT NULL DEFAULT '',
  mensaje_pendiente TEXT NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.configuracion (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ── TRIGGER updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clientes_updated_at ON public.clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS configuracion_updated_at ON public.configuracion;
CREATE TRIGGER configuracion_updated_at
  BEFORE UPDATE ON public.configuracion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_full_access" ON public.clientes;
DROP POLICY IF EXISTS "auth_full_access" ON public.pagos;
DROP POLICY IF EXISTS "auth_full_access" ON public.configuracion;

CREATE POLICY "auth_full_access" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.pagos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.configuracion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
