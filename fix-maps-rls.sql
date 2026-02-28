-- ═══════════════════════════════════════════════════════════
--  FIX RLS POLICIES PER MAPS
--  Esegui questo SQL nel SQL Editor di Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Rimuovi eventuali policy esistenti
DROP POLICY IF EXISTS "public_maps" ON maps;
DROP POLICY IF EXISTS "Enable all access for maps" ON maps;

-- 2. Abilita RLS sulla tabella maps (se non già abilitata)
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- 3. Crea policy permissiva (accesso totale)
-- NOTA: In produzione dovresti limitare questo, ma per testing va bene
CREATE POLICY "public_maps"
ON maps
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Verifica che la policy sia stata creata
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'maps';
