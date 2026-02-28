-- Aggiunge la colonna dice_theme alla tabella characters
-- Esegui questo script nella dashboard Supabase (SQL Editor)

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS dice_theme TEXT DEFAULT 'default';

-- Aggiorna descrizione colonna
COMMENT ON COLUMN characters.dice_theme IS 'Tema visivo per i dadi 3D: default, rust, smooth, rock, metal, wooden, gemstone, glass, diceOfRolling';

-- Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'characters' AND column_name = 'dice_theme';
