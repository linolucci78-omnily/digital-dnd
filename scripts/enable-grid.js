// ═══════════════════════════════════════════════════════════
//  Enable Grid by Default - Run migration
// ═══════════════════════════════════════════════════════════

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

async function enableGridByDefault() {
  console.log('🔧 Starting migration: Enable grid by default...\n');

  try {
    // 1. Get all scenes with grid disabled
    const { data: scenes, error: fetchError } = await supabase
      .from('scenes')
      .select('id, name, canvas_state')
      .eq('canvas_state->gridSettings->>enabled', 'false');

    if (fetchError) throw fetchError;

    console.log(`Found ${scenes.length} scenes with grid disabled\n`);

    // 2. Update each scene
    let updated = 0;
    for (const scene of scenes) {
      const canvasState = scene.canvas_state;

      // Enable grid and update size to 200px (better for token visibility)
      canvasState.gridSettings.enabled = true;
      canvasState.gridSettings.size = 200;

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ canvas_state: canvasState })
        .eq('id', scene.id);

      if (updateError) {
        console.error(`❌ Error updating scene "${scene.name}":`, updateError.message);
      } else {
        updated++;
        console.log(`✓ Updated scene: "${scene.name}" (grid enabled, size: 200px)`);
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updated} scenes.`);
    console.log('Grid is now enabled by default with 200px size (optimized for token visibility)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

enableGridByDefault();
