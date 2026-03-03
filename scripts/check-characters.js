// Check Characters in database
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

async function checkCharacters() {
  console.log('🔍 Checking Characters in database...\n');

  try {
    const { data: characters, error } = await supabase
      .from('characters')
      .select('*')
      .order('name');

    if (error) throw error;

    console.log(`✅ Found ${characters.length} characters total\n`);

    characters.forEach(char => {
      console.log(`\n📜 ${char.name}`);
      console.log(`   ID: ${char.id}`);
      console.log(`   Player Code: ${char.player_code || 'N/A'}`);
      console.log(`   Class: ${char.class} (Level ${char.level})`);
      console.log(`   HP: ${char.hp_current}/${char.hp_max}`);
      console.log(`   AC: ${char.armor_class}`);
      console.log(`   DEX: ${char.dexterity}`);
      console.log(`   Avatar: ${char.avatar_url ? '✓' : '✗'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCharacters();
