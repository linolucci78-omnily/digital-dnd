-- ═══════════════════════════════════════════════════════════
--  FIX STORAGE POLICIES PER BUCKET 'maps'
--  Esegui questo SQL nel SQL Editor di Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Rimuovi eventuali policy esistenti
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "maps_public_access" ON storage.objects;

-- 2. Crea policy per UPLOAD (INSERT)
CREATE POLICY "maps_upload"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'maps');

-- 3. Crea policy per READ (SELECT)
CREATE POLICY "maps_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'maps');

-- 4. Crea policy per UPDATE
CREATE POLICY "maps_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'maps')
WITH CHECK (bucket_id = 'maps');

-- 5. Crea policy per DELETE
CREATE POLICY "maps_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'maps');

-- 6. Assicurati che il bucket sia pubblico
UPDATE storage.buckets
SET public = true
WHERE id = 'maps';

-- 7. Verifica le policy create
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE 'maps_%';
