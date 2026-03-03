// Get TV password for campaign
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTVPassword() {
  console.log('🔍 Getting TV password...\n');

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('name, dm_code, tv_password')
      .eq('dm_code', '220678')
      .single();

    if (error) throw error;

    console.log('📜 Campaign:', data.name);
    console.log('🔑 DM Code:', data.dm_code);
    console.log('📺 TV Password:', data.tv_password || 'NO PASSWORD SET');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getTVPassword();
