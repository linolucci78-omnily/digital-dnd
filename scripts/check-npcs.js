// Check NPCs in database
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

async function checkNPCs() {
  console.log('🔍 Checking NPCs in database...\n');

  try {
    const { data: npcs, error } = await supabase
      .from('npcs')
      .select('*')
      .order('name');

    if (error) throw error;

    console.log(`✅ Found ${npcs.length} NPCs total\n`);

    const withAvatar = npcs.filter(n => n.avatar_url);
    const withoutAvatar = npcs.filter(n => !n.avatar_url);

    console.log(`📸 NPCs with avatar: ${withAvatar.length}`);
    console.log(`❌ NPCs without avatar: ${withoutAvatar.length}\n`);

    if (withAvatar.length > 0) {
      console.log('NPCs ready to use as tokens:');
      withAvatar.slice(0, 10).forEach(npc => {
        console.log(`  • ${npc.name} (${npc.class}) - HP: ${npc.hp_max}, AC: ${npc.armor_class}`);
      });
      if (withAvatar.length > 10) {
        console.log(`  ... and ${withAvatar.length - 10} more`);
      }
    }

    if (withoutAvatar.length > 0) {
      console.log('\n⚠️  NPCs missing avatars (add in NPC section):');
      withoutAvatar.slice(0, 5).forEach(npc => {
        console.log(`  • ${npc.name}`);
      });
      if (withoutAvatar.length > 5) {
        console.log(`  ... and ${withoutAvatar.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkNPCs();
