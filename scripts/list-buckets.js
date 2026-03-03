// List storage buckets
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

async function listBuckets() {
  console.log('🗂️  Listing storage buckets...\n');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    console.log(`✅ Found ${buckets.length} bucket(s):\n`);

    buckets.forEach(bucket => {
      console.log(`📁 ${bucket.name}`);
      console.log(`   ID: ${bucket.id}`);
      console.log(`   Public: ${bucket.public ? '✓' : '✗'}`);
      console.log(`   Created: ${bucket.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listBuckets();
