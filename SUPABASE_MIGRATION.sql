-- ═══════════════════════════════════════════════
-- MIGRATION: Adventure Mode System
-- Aggiunge supporto per modalità avventura guidata
-- ═══════════════════════════════════════════════

-- Aggiungi campi per adventure mode alla tabella sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS adventure_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_adventure_id TEXT,
ADD COLUMN IF NOT EXISTS current_scene_id TEXT,
ADD COLUMN IF NOT EXISTS adventure_state JSONB DEFAULT '{}'::jsonb;

-- Commenti per documentazione
COMMENT ON COLUMN sessions.adventure_mode IS 'True se la sessione usa modalità avventura guidata';
COMMENT ON COLUMN sessions.current_adventure_id IS 'ID avventura corrente (es: crypt_forgotten_king)';
COMMENT ON COLUMN sessions.current_scene_id IS 'ID scena corrente nell''avventura';
COMMENT ON COLUMN sessions.adventure_state IS 'Stato avventura (scelte fatte, flags, variabili, ecc)';

-- Esempio adventure_state:
-- {
--   "choices_made": ["accept_quest", "negotiate_payment"],
--   "flags": {
--     "has_crypt_map": true,
--     "old_marcus_grateful": true
--   },
--   "variables": {
--     "elena_alive": true,
--     "goblins_defeated": 2
--   }
-- }
