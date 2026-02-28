-- ═══════════════════════════════════════════════
-- SPRINT 1: Sistema Locations & Points of Interest
-- Migrazione database per sistema esplorazione
-- ═══════════════════════════════════════════════

-- Tabella Locations (scene/luoghi)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  map_url TEXT, -- URL mappa su Supabase Storage
  music_track TEXT DEFAULT 'exploration', -- 'exploration', 'combat', 'city', 'dungeon', 'tavern'
  is_current BOOLEAN DEFAULT false, -- location attualmente visualizzata sulla TV
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabella Points of Interest (elementi interattivi sulla mappa)
CREATE TABLE IF NOT EXISTS points_of_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'door', 'chest', 'npc', 'trap', 'secret', 'lore', 'hazard'
  description TEXT,
  x FLOAT NOT NULL, -- posizione X in percentuale (0-100)
  y FLOAT NOT NULL, -- posizione Y in percentuale (0-100)
  discovered BOOLEAN DEFAULT false, -- se true, i giocatori lo vedono
  requires_check TEXT, -- 'perception', 'investigation', 'arcana', null
  check_dc INT, -- Classe Difficoltà per scoprirlo (se requires_check)
  loot JSONB, -- array di oggetti: [{ item_name, quantity }]
  interaction_text TEXT, -- testo mostrato quando interagisci
  locked BOOLEAN DEFAULT false, -- se true, richiede chiave o scassinare
  lock_dc INT, -- CD per scassinare
  key_required TEXT, -- nome oggetto chiave necessario
  leads_to UUID REFERENCES locations(id), -- se type='door', porta a questa location
  npc_id UUID, -- se type='npc', riferimento a NPC (tabella futura)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_current ON locations(campaign_id, is_current);
CREATE INDEX IF NOT EXISTS idx_poi_location ON points_of_interest(location_id);
CREATE INDEX IF NOT EXISTS idx_poi_discovered ON points_of_interest(location_id, discovered);

-- RLS (Row Level Security) - tutti possono leggere, solo DM può modificare
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_of_interest ENABLE ROW LEVEL SECURITY;

-- Policy lettura: tutti possono vedere locations della propria campagna
CREATE POLICY "Locations visibili a tutti" ON locations
  FOR SELECT USING (true);

CREATE POLICY "POI visibili a tutti" ON points_of_interest
  FOR SELECT USING (true);

-- Policy scrittura: solo autenticati (DM) possono modificare
CREATE POLICY "Solo DM possono creare locations" ON locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Solo DM possono aggiornare locations" ON locations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Solo DM possono eliminare locations" ON locations
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Solo DM possono creare POI" ON points_of_interest
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Solo DM possono aggiornare POI" ON points_of_interest
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Solo DM possono eliminare POI" ON points_of_interest
  FOR DELETE USING (auth.role() = 'authenticated');

-- Funzione per assicurare che solo una location sia "current" per campagna
CREATE OR REPLACE FUNCTION set_current_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Se la nuova location è impostata come current
  IF NEW.is_current = true THEN
    -- Disabilita tutte le altre locations della stessa campagna
    UPDATE locations
    SET is_current = false
    WHERE campaign_id = NEW.campaign_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per gestire location corrente
DROP TRIGGER IF EXISTS trigger_set_current_location ON locations;
CREATE TRIGGER trigger_set_current_location
  BEFORE INSERT OR UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION set_current_location();

-- Seed data di esempio (opzionale - commentato)
/*
-- Esempio location taverna
INSERT INTO locations (campaign_id, name, description, music_track)
VALUES (
  'YOUR_CAMPAIGN_ID',
  'Taverna del Drago Rosso',
  'Una vecchia taverna fumosa con odore di birra e stufato. Il barista nano pulisce boccali dietro il bancone.',
  'tavern'
);

-- Esempio POI
INSERT INTO points_of_interest (location_id, name, type, x, y, description)
VALUES (
  'YOUR_LOCATION_ID',
  'Barista Nano',
  'npc',
  30,
  50,
  'Un nano burbero con barba rossa. Sembra sapere tutto quello che succede in città.'
);

INSERT INTO points_of_interest (location_id, name, type, x, y, discovered, requires_check, check_dc, description)
VALUES (
  'YOUR_LOCATION_ID',
  'Porta Segreta',
  'door',
  85,
  60,
  false,
  'perception',
  15,
  'Una porta nascosta dietro una vecchia tappezzeria. Dove conduce?'
);
*/

-- ═══════════════════════════════════════════════
-- NOTE:
-- 1. Esegui questa migration su Supabase SQL Editor
-- 2. Sostituisci YOUR_CAMPAIGN_ID se vuoi seed data
-- 3. Upload mappe su Supabase Storage bucket 'maps'
-- ═══════════════════════════════════════════════
