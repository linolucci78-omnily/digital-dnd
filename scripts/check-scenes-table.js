// Check scenes table structure
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

async function checkScenesTable() {
  console.log('🔍 Checking scenes table...\n');

  try {
    // Try to select from scenes table
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error accessing scenes table:', error.message);
      console.log('\n📋 Table might not exist. Required columns:');
      console.log('   - id (uuid, primary key)');
      console.log('   - campaign_id (uuid, foreign key)');
      console.log('   - name (text)');
      console.log('   - description (text, nullable)');
      console.log('   - thumbnail_url (text, nullable)');
      console.log('   - map_image_url (text, nullable)');
      console.log('   - grid_size (integer, default 200)');
      console.log('   - grid_offset_x (integer, default 0)');
      console.log('   - grid_offset_y (integer, default 0)');
      console.log('   - grid_enabled (boolean, default true)');
      console.log('   - grid_snap (boolean, default true)');
      console.log('   - created_at (timestamp)');
      console.log('   - updated_at (timestamp)');
      return;
    }

    console.log('✅ Scenes table exists!');
    console.log(`📊 Found ${scenes?.length || 0} scene(s)\n`);

    if (scenes && scenes.length > 0) {
      console.log('Example scene structure:');
      console.log(JSON.stringify(scenes[0], null, 2));
    }

    // Check storage bucket
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (!bucketError) {
      const scenesBucket = buckets.find(b => b.name === 'scenes');
      if (scenesBucket) {
        console.log('\n✅ Storage bucket "scenes" exists!');
      } else {
        console.log('\n⚠️  Storage bucket "scenes" NOT found!');
        console.log('   Create it in Supabase dashboard:');
        console.log('   Storage > New Bucket > Name: "scenes" > Public: true');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkScenesTable();
