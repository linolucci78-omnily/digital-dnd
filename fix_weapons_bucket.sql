-- ═══════════════════════════════════════════════
-- FIX BUCKET "WEAPONS" - Policy RLS permissiva
-- Esegui su Supabase SQL Editor per risolvere errori upload
-- ═══════════════════════════════════════════════

-- 1. Crea bucket pubblico (se non esiste)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'weapons',
  'weapons',
  true,  -- PUBBLICO per vedere le immagini
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Rimuovi policy vecchie (se esistono)
DROP POLICY IF EXISTS "Public can view weapon images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload weapon images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their weapon images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their weapon images" ON storage.objects;
DROP POLICY IF EXISTS "weapons_all_access" ON storage.objects;

-- 3. Crea policy permissiva: TUTTI possono fare TUTTO
CREATE POLICY "weapons_all_access"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'weapons')
WITH CHECK (bucket_id = 'weapons');

-- ═══════════════════════════════════════════════
-- ✅ FATTO! Ora puoi uploadare immagini armi
-- ═══════════════════════════════════════════════

-- VERIFICA: Mostra policy attive
SELECT
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname = 'weapons_all_access';
