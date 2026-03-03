-- Add battle_map_url column to sessions table
-- This separates the narrative map (map_url) from the tactical battle map (battle_map_url)

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS battle_map_url TEXT;

COMMENT ON COLUMN sessions.battle_map_url IS 'URL della mappa tattica per il Battle Grid (separata dalla mappa narrativa)';
