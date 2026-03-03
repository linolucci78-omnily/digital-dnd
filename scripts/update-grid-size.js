// ═══════════════════════════════════════════════════════════
//  Update Grid Size from 140px to 200px
//  Better token visibility
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

async function updateGridSize() {
  console.log('🔧 Updating grid size from 140px to 200px for better token visibility...\n');

  try {
    // Get all scenes
    const { data: scenes, error: fetchError } = await supabase
      .from('scenes')
      .select('id, name, canvas_state');

    if (fetchError) throw fetchError;

    console.log(`Found ${scenes.length} scenes total\n`);

    let updated = 0;
    for (const scene of scenes) {
      const canvasState = scene.canvas_state;

      // Check if grid size needs update
      if (canvasState?.gridSettings?.size && canvasState.gridSettings.size < 200) {
        canvasState.gridSettings.size = 200;

        const { error: updateError } = await supabase
          .from('scenes')
          .update({ canvas_state: canvasState })
          .eq('id', scene.id);

        if (updateError) {
          console.error(`❌ Error updating scene "${scene.name}":`, updateError.message);
        } else {
          updated++;
          console.log(`✓ Updated scene: "${scene.name}" → 200px`);
        }
      }
    }

    console.log(`\n✅ Update complete! Updated ${updated} scenes to 200px grid size.`);
    console.log('This provides better visibility for tokens (~100-150px)');

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateGridSize();
