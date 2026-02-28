-- Aggiungi campi equipment alla tabella characters
-- Esegui questo script nella dashboard Supabase (SQL Editor)

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS equipped_armor JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS equipped_weapon_main JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS equipped_weapon_offhand JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS equipped_shield JSONB DEFAULT NULL;

-- Aggiungi commenti per documentazione
COMMENT ON COLUMN characters.equipped_armor IS 'Armatura equipaggiata: {name, type (light/medium/heavy), ac_base, max_dex_bonus, stealth_disadvantage}';
COMMENT ON COLUMN characters.equipped_weapon_main IS 'Arma principale: {name, damage, damage_type, properties[]}';
COMMENT ON COLUMN characters.equipped_weapon_offhand IS 'Arma secondaria/offhand: {name, damage, damage_type, properties[]}';
COMMENT ON COLUMN characters.equipped_shield IS 'Scudo: {name, ac_bonus}';

-- Verifica che le colonne siano state aggiunte
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'characters'
AND column_name IN ('equipped_armor', 'equipped_weapon_main', 'equipped_weapon_offhand', 'equipped_shield');
