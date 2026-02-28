-- Fix RLS policies per permettere accesso senza autenticazione (per testing)
-- In produzione, dovresti usare autenticazione vera

-- Drop vecchie policies
DROP POLICY IF EXISTS "Solo DM possono creare locations" ON locations;
DROP POLICY IF EXISTS "Solo DM possono aggiornare locations" ON locations;
DROP POLICY IF EXISTS "Solo DM possono eliminare locations" ON locations;
DROP POLICY IF EXISTS "Solo DM possono creare POI" ON points_of_interest;
DROP POLICY IF EXISTS "Solo DM possono aggiornare POI" ON points_of_interest;
DROP POLICY IF EXISTS "Solo DM possono eliminare POI" ON points_of_interest;

-- Nuove policies permissive (per testing)
CREATE POLICY "Tutti possono creare locations" ON locations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tutti possono aggiornare locations" ON locations
  FOR UPDATE USING (true);

CREATE POLICY "Tutti possono eliminare locations" ON locations
  FOR DELETE USING (true);

CREATE POLICY "Tutti possono creare POI" ON points_of_interest
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tutti possono aggiornare POI" ON points_of_interest
  FOR UPDATE USING (true);

CREATE POLICY "Tutti possono eliminare POI" ON points_of_interest
  FOR DELETE USING (true);
