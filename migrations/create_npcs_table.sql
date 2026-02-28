-- Crea tabella NPCs per il DM
-- Esegui questo script nella dashboard Supabase (SQL Editor)

CREATE TABLE IF NOT EXISTS npcs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Info base
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  race TEXT DEFAULT 'Umano',
  attitude TEXT DEFAULT 'neutral', -- friendly, neutral, hostile

  -- Stats combat
  hp_max INTEGER DEFAULT 10,
  hp_current INTEGER DEFAULT 10,
  armor_class INTEGER DEFAULT 10,

  -- Caratteristiche
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  intelligence INTEGER DEFAULT 10,
  wisdom INTEGER DEFAULT 10,
  charisma INTEGER DEFAULT 10,

  -- Info narrative
  description TEXT,
  location TEXT,
  special_abilities TEXT,
  inventory_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index per performance
CREATE INDEX IF NOT EXISTS npcs_campaign_id_idx ON npcs(campaign_id);

-- Commento tabella
COMMENT ON TABLE npcs IS 'NPC (Non-Player Characters) gestiti dal DM con stat blocks completi';

-- Abilita Row Level Security
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;

-- Policy: tutti possono leggere NPC della campagna (per ora permissiva)
CREATE POLICY "Anyone can view NPCs"
  ON npcs FOR SELECT
  USING (true);

-- Policy: tutti possono inserire/modificare/eliminare (da restringere in produzione)
CREATE POLICY "Anyone can insert NPCs"
  ON npcs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update NPCs"
  ON npcs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete NPCs"
  ON npcs FOR DELETE
  USING (true);

-- Verifica creazione tabella
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'npcs'
ORDER BY ordinal_position;
