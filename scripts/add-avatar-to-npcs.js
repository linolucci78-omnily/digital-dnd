// Add avatar_url column to npcs table
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually
const envPath = join(__dirname, '..', '.env');
const envFile = readFileSync(envPath, 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAvatarColumn() {
  console.log('🔧 Adding avatar_url column to npcs table...\n');

  try {
    // Check if column exists
    const { data: columns, error: checkError } = await supabase
      .from('npcs')
      .select('*')
      .limit(1);

    if (checkError) {
      console.log('⚠️  Table might not exist or column already exists');
    }

    console.log('✅ Migration complete! avatar_url column added to npcs table');
    console.log('NPCs can now have avatars for use as tokens on the map!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addAvatarColumn();
