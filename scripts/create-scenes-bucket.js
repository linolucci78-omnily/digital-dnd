// Create scenes storage bucket
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
const supabaseKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createScenesBucket() {
  console.log('🗂️  Creating "scenes" storage bucket...\n');

  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();

    const exists = buckets?.find(b => b.name === 'scenes');

    if (exists) {
      console.log('✅ Bucket "scenes" already exists!');
      return;
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket('scenes', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\n⚠️  If you get a permissions error, you need to:');
      console.log('   1. Go to Supabase Dashboard > Storage');
      console.log('   2. Click "New Bucket"');
      console.log('   3. Name: "scenes"');
      console.log('   4. Public: ✓ Yes');
      console.log('   5. File size limit: 50MB');
      console.log('   6. Allowed MIME types: image/*');
      return;
    }

    console.log('✅ Bucket "scenes" created successfully!');
    console.log('📊 Bucket ID:', data.name);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createScenesBucket();
