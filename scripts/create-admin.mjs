/**
 * Crea el usuario administrador por defecto en Supabase Auth.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/create-admin.mjs
 *
 * Credenciales por defecto:
 *   Email:    gestiona@misan.com
 *   Password: 2598
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_EMAIL = 'gestiona@misan.com';
const DEFAULT_PASSWORD = '2598';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const authHeaders = {
  'Content-Type': 'application/json',
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error(`Error al listar usuarios (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.users ?? [];
}

async function createUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'admin', username: 'gestiona' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Error al crear usuario (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

try {
  const users = await listUsers();
  const alreadyExists = users.some((u) => u.email === DEFAULT_EMAIL);

  if (alreadyExists) {
    console.log(`✅ El usuario ${DEFAULT_EMAIL} ya existe. No se creó uno nuevo.`);
    process.exit(0);
  }

  const data = await createUser();
  console.log('✅ Usuario administrador creado:');
  console.log(`   Email:    ${DEFAULT_EMAIL}`);
  console.log(`   Password: ${DEFAULT_PASSWORD}`);
  console.log(`   ID:       ${data.id}`);
} catch (error) {
  console.error('❌', error.message);
  process.exit(1);
}
