# Gestiona Cobros

Panel de gestión de cobros mensuales con clientes, pagos, WhatsApp y cotización USD/ARS.

## Credenciales por defecto

| Campo      | Valor                |
|------------|----------------------|
| Usuario    | `gestiona`           |
| Contraseña | `2598`               |
| Email auth | `gestiona@misan.com` |

## Setup inicial (una sola vez)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear tablas en Supabase

En [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor** → ejecutar el contenido de:

```
supabase/setup.sql
```

Esto crea las tablas `clientes`, `pagos`, `configuracion`, activa RLS y migra los datos del KV store anterior.

### 3. Crear usuario administrador

En Supabase → **Settings → API** copiá la `service_role` key y ejecutá:

```bash
SUPABASE_URL=https://qhdxtwargzpjljytqlvm.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key> \
npm run setup:admin
```

### 4. Desactivar registros públicos

En Supabase → **Authentication → Providers** → desactivar **Enable sign ups**.

### 5. Correr la app

```bash
npm run dev
```

## Arquitectura

```
Frontend (React/Vite)
    ↓ Supabase JS + JWT de sesión
PostgreSQL (tablas con RLS)
    ├── clientes
    ├── pagos
    └── configuracion (fila única)
```

Ver `supabase/DATABASE.md` para el diagrama completo.

## Variables de entorno (opcional)

Copiá `.env.example` a `.env` si querés sobreescribir las credenciales por defecto.

## Build producción

```bash
npm run build
```

El output queda en `dist/`.

## Deploy en Vercel

1. Importá el repo desde GitHub en [vercel.com](https://vercel.com)
2. Agregá las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`
4. Output directory: `dist`
