// Script per eseguire migration SQL su Supabase
// Usage: node run-migration.js migrations/sprint1_locations.sql

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Mancano VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY nel .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sqlFile = process.argv[2] || 'migrations/sprint1_locations.sql';

try {
  console.log(`📄 Leggendo ${sqlFile}...`);
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log(`🚀 Eseguendo migration su ${supabaseUrl}...`);

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Errore migration:', error);
    process.exit(1);
  }

  console.log('✅ Migration completata con successo!');
  console.log(data);

} catch (err) {
  console.error('❌ Errore:', err.message);
  process.exit(1);
}
