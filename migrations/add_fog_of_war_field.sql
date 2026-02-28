-- Aggiungi campo fog_of_war alla tabella sessions
-- Esegui questo script nella dashboard Supabase (SQL Editor)

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS fog_of_war TEXT DEFAULT NULL;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN sessions.fog_of_war IS 'Dati canvas Fog of War (base64 image data) per nascondere parti della mappa';

-- Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'fog_of_war';
