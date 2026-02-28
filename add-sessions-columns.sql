-- ═══════════════════════════════════════════════════════════
--  AGGIUNGI COLONNE MANCANTI A SESSIONS
--  Esegui questo SQL nel SQL Editor di Supabase
-- ═══════════════════════════════════════════════════════════

-- Aggiungi colonna map_url (URL della mappa attiva)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Aggiungi colonna token_positions (posizioni token sulla mappa)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS token_positions JSONB DEFAULT '{}';

-- Verifica che le colonne siano state create
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
AND column_name IN ('map_url', 'token_positions');
