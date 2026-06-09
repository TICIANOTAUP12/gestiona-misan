-- ============================================================
-- Migración: kv_store_1bcc1131 → tablas SQL
-- Ejecutar DESPUÉS de 20250609000001_schema.sql
-- Idempotente: se puede re-ejecutar sin duplicar datos
-- ============================================================

-- ── CLIENTES desde KV ───────────────────────────────────────
INSERT INTO public.clientes (
  id, nombre, telefono, cantidad_sistemas, monto_cuota, saldo,
  metodo_pago, estado, mensaje_vencimiento, mensaje_pago_pendiente, fecha_vencimiento
)
SELECT
  kv.value->>'id',
  COALESCE(kv.value->>'nombre', ''),
  COALESCE(kv.value->>'telefono', ''),
  COALESCE((kv.value->>'cantidadSistemas')::INTEGER, 1),
  COALESCE((kv.value->>'montoCuota')::NUMERIC, 0),
  COALESCE((kv.value->>'saldo')::NUMERIC, 0),
  COALESCE(kv.value->>'metodoPago', ''),
  COALESCE(kv.value->>'estado', 'al-dia'),
  kv.value->>'mensajeVencimiento',
  kv.value->>'mensajePagoPendiente',
  kv.value->>'fechaVencimiento'
FROM kv_store_1bcc1131 kv
WHERE kv.key LIKE 'cliente:%'
  AND kv.value->>'id' IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  nombre               = EXCLUDED.nombre,
  telefono             = EXCLUDED.telefono,
  cantidad_sistemas    = EXCLUDED.cantidad_sistemas,
  monto_cuota          = EXCLUDED.monto_cuota,
  saldo                = EXCLUDED.saldo,
  metodo_pago          = EXCLUDED.metodo_pago,
  estado               = EXCLUDED.estado,
  mensaje_vencimiento  = EXCLUDED.mensaje_vencimiento,
  mensaje_pago_pendiente = EXCLUDED.mensaje_pago_pendiente,
  fecha_vencimiento    = EXCLUDED.fecha_vencimiento,
  updated_at           = NOW();

-- ── PAGOS desde KV ──────────────────────────────────────────
INSERT INTO public.pagos (
  id, cliente_id, cliente_nombre, monto, monto_original, descuento,
  fecha, alias, tipo, es_cuota_mensual
)
SELECT
  kv.value->>'id',
  kv.value->>'clienteId',
  COALESCE(kv.value->>'clienteNombre', ''),
  COALESCE((kv.value->>'monto')::NUMERIC, 0),
  COALESCE((kv.value->>'montoOriginal')::NUMERIC, 0),
  COALESCE((kv.value->>'descuento')::NUMERIC, 0),
  COALESCE((kv.value->>'fecha')::TIMESTAMPTZ, NOW()),
  COALESCE(kv.value->>'alias', ''),
  COALESCE(kv.value->>'tipo', 'total'),
  COALESCE((kv.value->>'esCuotaMensual')::BOOLEAN, FALSE)
FROM kv_store_1bcc1131 kv
WHERE kv.key LIKE 'pago:%'
  AND kv.value->>'id' IS NOT NULL
  AND kv.value->>'clienteId' IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = kv.value->>'clienteId')
ON CONFLICT (id) DO NOTHING;

-- ── CONFIGURACIÓN desde KV ──────────────────────────────────
INSERT INTO public.configuracion (
  id, valor_sistema, valor_sistema_usd, cotizacion_usd,
  alias_cobranza, alias2_cobranza, mensaje_vencido, mensaje_pendiente
)
SELECT
  1,
  COALESCE((kv.value->>'valorSistema')::NUMERIC, 12500),
  COALESCE((kv.value->>'valorSistemaUSD')::NUMERIC, 10),
  COALESCE((kv.value->>'cotizacionUSD')::NUMERIC, 1200),
  COALESCE(kv.value->>'aliasCobranza', ''),
  COALESCE(kv.value->>'alias2Cobranza', ''),
  COALESCE(kv.value->>'mensajeVencido', ''),
  COALESCE(kv.value->>'mensajePendiente', '')
FROM kv_store_1bcc1131 kv
WHERE kv.key = 'config'
ON CONFLICT (id) DO UPDATE SET
  valor_sistema     = EXCLUDED.valor_sistema,
  valor_sistema_usd = EXCLUDED.valor_sistema_usd,
  cotizacion_usd    = EXCLUDED.cotizacion_usd,
  alias_cobranza    = EXCLUDED.alias_cobranza,
  alias2_cobranza   = EXCLUDED.alias2_cobranza,
  mensaje_vencido   = EXCLUDED.mensaje_vencido,
  mensaje_pendiente = EXCLUDED.mensaje_pendiente,
  updated_at        = NOW();
