-- Add avatar_url column to npcs table
ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN npcs.avatar_url IS 'URL dell avatar/immagine del NPC (da Supabase Storage)';
