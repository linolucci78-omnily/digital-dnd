-- Aggiungi campo concentration_spell alla tabella characters
-- Esegui questo script nella dashboard Supabase (SQL Editor)

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS concentration_spell TEXT DEFAULT NULL;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN characters.concentration_spell IS 'Nome dell incantesimo su cui si sta mantenendo la concentrazione (NULL se nessuno)';

-- Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'characters' AND column_name = 'concentration_spell';
