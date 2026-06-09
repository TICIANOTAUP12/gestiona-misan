# Base de datos — Gestiona Cobros

## Diagrama

```
┌─────────────────────┐       ┌─────────────────────┐
│      clientes       │       │    configuracion    │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id = 1 (PK, única)  │
│ nombre              │       │ valor_sistema       │
│ telefono            │       │ valor_sistema_usd   │
│ cantidad_sistemas   │       │ cotizacion_usd      │
│ monto_cuota         │       │ alias_cobranza      │
│ saldo               │       │ alias2_cobranza     │
│ metodo_pago         │       │ mensaje_vencido     │
│ estado              │       │ mensaje_pendiente   │
│ mensaje_vencimiento │       │ updated_at          │
│ mensaje_pago_pend.  │       └─────────────────────┘
│ fecha_vencimiento   │
│ created_at          │
│ updated_at          │
└─────────┬───────────┘
          │ 1:N
          ▼
┌─────────────────────┐
│        pagos        │
├─────────────────────┤
│ id (PK)             │
│ cliente_id (FK)     │
│ cliente_nombre      │
│ monto               │
│ monto_original      │
│ descuento           │
│ fecha               │
│ alias               │
│ tipo                │
│ es_cuota_mensual    │
│ created_at          │
└─────────────────────┘
```

## Seguridad (RLS)

Todas las tablas tienen **Row Level Security** activado.
Solo usuarios **autenticados** (`authenticated`) pueden leer y escribir.

La clave `anon` sola ya no accede a los datos — se requiere JWT de sesión.

## Tabla legacy

`kv_store_1bcc1131` — almacenamiento anterior (Figma Make).
Los datos se migran automáticamente con `20250609000002_migrate_kv_data.sql`.

## Setup en Supabase Dashboard

1. **SQL Editor** → ejecutar en orden:
   - `migrations/20250609000001_schema.sql`
   - `migrations/20250609000002_migrate_kv_data.sql`

2. **Authentication → Providers** → desactivar "Enable sign ups"

3. **Crear usuario admin** (terminal):
   ```bash
   SUPABASE_URL=https://qhdxtwargzpjljytqlvm.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service_role> \
   node scripts/create-admin.mjs
   ```

   Credenciales por defecto:
   - Usuario: `gestiona` (o email `gestiona@misan.com`)
   - Contraseña: `2598`
