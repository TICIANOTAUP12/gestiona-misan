-- ============================================================
-- SETUP COMPLETO — Ejecutar una sola vez en Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Pegar y Run
-- ============================================================

-- ── 1. ESQUEMA ──────────────────────────────────────────────

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

INSERT INTO public.configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clientes_updated_at ON public.clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS configuracion_updated_at ON public.configuracion;
CREATE TRIGGER configuracion_updated_at
  BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

-- ── 2. MIGRAR DATOS DESDE KV STORE ──────────────────────────

INSERT INTO public.clientes (
  id, nombre, telefono, cantidad_sistemas, monto_cuota, saldo,
  metodo_pago, estado, mensaje_vencimiento, mensaje_pago_pendiente, fecha_vencimiento
)
SELECT
  kv.value->>'id', COALESCE(kv.value->>'nombre', ''),
  COALESCE(kv.value->>'telefono', ''),
  COALESCE((kv.value->>'cantidadSistemas')::INTEGER, 1),
  COALESCE((kv.value->>'montoCuota')::NUMERIC, 0),
  COALESCE((kv.value->>'saldo')::NUMERIC, 0),
  COALESCE(kv.value->>'metodoPago', ''),
  COALESCE(kv.value->>'estado', 'al-dia'),
  kv.value->>'mensajeVencimiento', kv.value->>'mensajePagoPendiente',
  kv.value->>'fechaVencimiento'
FROM kv_store_1bcc1131 kv
WHERE kv.key LIKE 'cliente:%' AND kv.value->>'id' IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono,
  cantidad_sistemas = EXCLUDED.cantidad_sistemas, monto_cuota = EXCLUDED.monto_cuota,
  saldo = EXCLUDED.saldo, metodo_pago = EXCLUDED.metodo_pago, estado = EXCLUDED.estado,
  mensaje_vencimiento = EXCLUDED.mensaje_vencimiento,
  mensaje_pago_pendiente = EXCLUDED.mensaje_pago_pendiente,
  fecha_vencimiento = EXCLUDED.fecha_vencimiento, updated_at = NOW();

INSERT INTO public.pagos (
  id, cliente_id, cliente_nombre, monto, monto_original, descuento,
  fecha, alias, tipo, es_cuota_mensual
)
SELECT
  kv.value->>'id', kv.value->>'clienteId',
  COALESCE(kv.value->>'clienteNombre', ''),
  COALESCE((kv.value->>'monto')::NUMERIC, 0),
  COALESCE((kv.value->>'montoOriginal')::NUMERIC, 0),
  COALESCE((kv.value->>'descuento')::NUMERIC, 0),
  COALESCE((kv.value->>'fecha')::TIMESTAMPTZ, NOW()),
  COALESCE(kv.value->>'alias', ''), COALESCE(kv.value->>'tipo', 'total'),
  COALESCE((kv.value->>'esCuotaMensual')::BOOLEAN, FALSE)
FROM kv_store_1bcc1131 kv
WHERE kv.key LIKE 'pago:%' AND kv.value->>'id' IS NOT NULL
  AND kv.value->>'clienteId' IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = kv.value->>'clienteId')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.configuracion (
  id, valor_sistema, valor_sistema_usd, cotizacion_usd,
  alias_cobranza, alias2_cobranza, mensaje_vencido, mensaje_pendiente
)
SELECT 1,
  COALESCE((kv.value->>'valorSistema')::NUMERIC, 12500),
  COALESCE((kv.value->>'valorSistemaUSD')::NUMERIC, 10),
  COALESCE((kv.value->>'cotizacionUSD')::NUMERIC, 1200),
  COALESCE(kv.value->>'aliasCobranza', ''), COALESCE(kv.value->>'alias2Cobranza', ''),
  COALESCE(kv.value->>'mensajeVencido', ''), COALESCE(kv.value->>'mensajePendiente', '')
FROM kv_store_1bcc1131 kv WHERE kv.key = 'config'
ON CONFLICT (id) DO UPDATE SET
  valor_sistema = EXCLUDED.valor_sistema, valor_sistema_usd = EXCLUDED.valor_sistema_usd,
  cotizacion_usd = EXCLUDED.cotizacion_usd, alias_cobranza = EXCLUDED.alias_cobranza,
  alias2_cobranza = EXCLUDED.alias2_cobranza, mensaje_vencido = EXCLUDED.mensaje_vencido,
  mensaje_pendiente = EXCLUDED.mensaje_pendiente, updated_at = NOW();
