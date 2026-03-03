-- ═══════════════════════════════════════════════════════════
--  UNIFIED SCENE SYSTEM - Professional VTT Architecture
--  Ispirato a Foundry VTT - Sistema pulito e scalabile
-- ═══════════════════════════════════════════════════════════

-- 1. Crea tabella SCENES (sostituisce map_url + battle_map_url frammentati)
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  scene_type TEXT DEFAULT 'exploration', -- 'exploration', 'combat', 'social'

  -- Visual Assets
  map_url TEXT, -- URL dell'immagine di background
  thumbnail_url TEXT, -- Preview per DM panel

  -- Grid Configuration (Battle Grid integrato!)
  grid_enabled BOOLEAN DEFAULT true,
  grid_size INTEGER DEFAULT 50, -- pixels per cella
  grid_opacity FLOAT DEFAULT 0.15,
  grid_color TEXT DEFAULT 'rgba(201,168,76,1)',

  -- Fog of War State (salvato come JSON)
  fog_enabled BOOLEAN DEFAULT false,
  fog_data JSONB, -- Canvas data della fog

  -- Lighting & Ambience
  ambient_light FLOAT DEFAULT 1.0, -- 0 = buio totale, 1 = luce piena
  music_track TEXT, -- URL traccia audio
  ambient_sounds JSONB, -- Array di effetti sonori

  -- Navigation
  entry_point_x FLOAT DEFAULT 50, -- % posizione ingresso
  entry_point_y FLOAT DEFAULT 50,

  -- State
  is_active BOOLEAN DEFAULT false, -- Solo una scena attiva per campaign

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index per performance
CREATE INDEX idx_scenes_campaign ON scenes(campaign_id);
CREATE INDEX idx_scenes_active ON scenes(campaign_id, is_active) WHERE is_active = true;

-- 2. Aggiorna tabella SESSIONS - rimuove camcampi frammentati
ALTER TABLE sessions
  DROP COLUMN IF EXISTS map_url,
  DROP COLUMN IF EXISTS battle_map_url,
  ADD COLUMN IF NOT EXISTS current_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

-- 3. Aggiorna tabella LOCATIONS - mantiene compatibilità ma depreca map_url
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS default_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;
-- NOTA: locations.map_url resta per backward compatibility, ma ora crea automaticamente una scene

-- 4. Trigger per garantire solo UNA scena attiva per campaign
CREATE OR REPLACE FUNCTION enforce_single_active_scene()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Disattiva tutte le altre scene dello stesso campaign
    UPDATE scenes
    SET is_active = false
    WHERE campaign_id = NEW.campaign_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_active_scene
  BEFORE INSERT OR UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_scene();

-- 5. Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_scene_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scene_timestamp
  BEFORE UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_scene_timestamp();

-- 6. Row Level Security (RLS) per scenes
-- NOTA: Usa policy pubbliche come campaigns/characters/sessions
-- La sicurezza è gestita a livello applicativo tramite codici (dm_code, player_code)
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- Policy: Accesso pubblico (sicurezza gestita dall'app)
CREATE POLICY "public_scenes" ON scenes FOR ALL USING (true);

-- 7. Funzione helper per creare scene da location esistente
CREATE OR REPLACE FUNCTION migrate_location_to_scene(location_id UUID)
RETURNS UUID AS $$
DECLARE
  new_scene_id UUID;
  loc RECORD;
BEGIN
  -- Recupera la location
  SELECT * INTO loc FROM locations WHERE id = location_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location not found: %', location_id;
  END IF;

  -- Crea scene dalla location
  INSERT INTO scenes (
    campaign_id,
    name,
    description,
    map_url,
    scene_type,
    music_track,
    entry_point_x,
    entry_point_y,
    is_active
  ) VALUES (
    loc.campaign_id,
    loc.name,
    loc.description,
    loc.map_url,
    'exploration',
    loc.music_track,
    COALESCE(loc.entry_point_x, 50),
    COALESCE(loc.entry_point_y, 50),
    COALESCE(loc.is_current, false)
  )
  RETURNING id INTO new_scene_id;

  -- Collega la scene alla location
  UPDATE locations
  SET default_scene_id = new_scene_id
  WHERE id = location_id;

  RETURN new_scene_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Migrazione automatica: Converti location esistenti in scene
DO $$
DECLARE
  loc RECORD;
BEGIN
  FOR loc IN SELECT id FROM locations WHERE map_url IS NOT NULL AND default_scene_id IS NULL
  LOOP
    BEGIN
      PERFORM migrate_location_to_scene(loc.id);
      RAISE NOTICE 'Migrated location % to scene', loc.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to migrate location %: %', loc.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- 9. Comments per documentazione
COMMENT ON TABLE scenes IS 'Unified scene system - contains all visual environments (exploration, combat, social). Replaces fragmented map_url/battle_map_url approach.';
COMMENT ON COLUMN scenes.scene_type IS 'Type of scene: exploration (free movement), combat (grid-based), social (NPC interactions)';
COMMENT ON COLUMN scenes.fog_data IS 'JSON data for fog of war canvas state (saved by DM)';
COMMENT ON COLUMN scenes.grid_enabled IS 'Whether to show tactical grid overlay (primarily for combat scenes)';

-- ═══════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════
-- NEXT STEPS:
-- 1. Update DMPanel to use Scene Manager instead of separate map uploads
-- 2. Update TVScreen to listen only to 'scene_change' event
-- 3. Update LocationManager to create/link scenes
-- 4. Deprecate old map_update/battle_map_update events
-- ═══════════════════════════════════════════════════════════
