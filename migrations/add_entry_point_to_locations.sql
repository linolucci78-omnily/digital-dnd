-- ═══════════════════════════════════════════════════════════
--  Aggiunge punto d'ingresso alle location
--  Per reset automatico posizione personaggi quando cambia scena
-- ═══════════════════════════════════════════════════════════

-- Aggiungi colonne entry_point
ALTER TABLE locations
ADD COLUMN entry_point_x FLOAT DEFAULT 50,
ADD COLUMN entry_point_y FLOAT DEFAULT 90;

-- Commenti
COMMENT ON COLUMN locations.entry_point_x IS 'Posizione X (%) dove appaiono i personaggi quando entrano';
COMMENT ON COLUMN locations.entry_point_y IS 'Posizione Y (%) dove appaiono i personaggi quando entrano (default: 90% = in basso)';
