const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY');
  console.error('Ejecuta: SUPABASE_URL=https://txjglqkttidhhobovzzz.supabase.co SUPABASE_SERVICE_KEY=tu_key node tools/update-admin-password.js');
  process.exit(1);
}

const NEW_PASSWORD = 'CBXadmin.123$$##';
const ADMIN_EMAIL = 'admin@isinet.cl';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error al listar usuarios:', listError.message);
    process.exit(1);
  }

  const admin = users.users.find(u => u.email === ADMIN_EMAIL);
  if (!admin) {
    console.error(`No se encontró usuario con email ${ADMIN_EMAIL}`);
    process.exit(1);
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
    password: NEW_PASSWORD
  });

  if (error) {
    console.error('Error al actualizar contraseña:', error.message);
    process.exit(1);
  }

  console.log(`Contraseña actualizada para ${ADMIN_EMAIL}`);
  console.log(`Nueva contraseña: ${NEW_PASSWORD}`);
}

main();
