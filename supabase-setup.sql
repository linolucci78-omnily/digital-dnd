-- ═══════════════════════════════════════════════════════════
--  digitalDnD — Schema Database
--  D&D 5e Digitale — Campagne persistenti, personaggi, sessioni
-- ═══════════════════════════════════════════════════════════

-- ── CAMPAGNE ──
-- Una campagna è la storia lunga che va avanti nel tempo
CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  dm_name     TEXT NOT NULL,
  dm_code     TEXT NOT NULL, -- codice segreto del DM per rientrare
  join_code   TEXT NOT NULL UNIQUE, -- codice per i giocatori
  world       TEXT DEFAULT 'Forgotten Realms',
  level_cap   INT DEFAULT 20,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── PERSONAGGI ──
-- Scheda personaggio completa D&D 5e
CREATE TABLE IF NOT EXISTS characters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  player_name     TEXT NOT NULL,
  player_code     TEXT NOT NULL, -- codice per rientrare come questo personaggio
  -- Identità
  name            TEXT NOT NULL,
  race            TEXT NOT NULL,
  subrace         TEXT,
  class           TEXT NOT NULL,
  subclass        TEXT,
  background      TEXT NOT NULL,
  alignment       TEXT DEFAULT 'Neutrale',
  level           INT DEFAULT 1,
  xp              INT DEFAULT 0,
  -- Statistiche base (ability scores)
  strength        INT NOT NULL,
  dexterity       INT NOT NULL,
  constitution    INT NOT NULL,
  intelligence    INT NOT NULL,
  wisdom          INT NOT NULL,
  charisma        INT NOT NULL,
  -- Combattimento
  hp_max          INT NOT NULL,
  hp_current      INT NOT NULL,
  hp_temp         INT DEFAULT 0,
  armor_class     INT DEFAULT 10,
  speed           INT DEFAULT 30,
  initiative      INT DEFAULT 0,
  proficiency_bonus INT DEFAULT 2,
  -- Spell slots (per livello 1-9)
  spell_slots     JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}',
  spell_slots_used JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0}',
  -- Hit dice
  hit_dice_total  INT DEFAULT 1,
  hit_dice_used   INT DEFAULT 0,
  -- Death saving throws
  death_saves_success INT DEFAULT 0,
  death_saves_fail    INT DEFAULT 0,
  is_stable           BOOLEAN DEFAULT true,
  -- Proficienze e skills
  proficiencies   JSONB DEFAULT '[]',
  saving_throws   JSONB DEFAULT '[]',
  skills          JSONB DEFAULT '{}',
  -- Inventario
  inventory       JSONB DEFAULT '[]',
  gold            INT DEFAULT 0,
  silver          INT DEFAULT 0,
  copper          INT DEFAULT 0,
  -- Incantesimi
  spells_known    JSONB DEFAULT '[]',
  spells_prepared JSONB DEFAULT '[]',
  cantrips        JSONB DEFAULT '[]',
  -- Tratti e note
  traits          TEXT,
  ideals          TEXT,
  bonds           TEXT,
  flaws           TEXT,
  backstory       TEXT,
  notes           TEXT,
  -- Condizioni attive
  conditions      JSONB DEFAULT '[]',
  -- Ispirazione
  inspiration     BOOLEAN DEFAULT false,
  -- Avatar/token
  avatar_url      TEXT,
  token_color     TEXT DEFAULT '#d4af37',
  -- Posizione sulla mappa (sessione corrente)
  map_x           FLOAT DEFAULT 0,
  map_y           FLOAT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── SESSIONI ──
-- Una sessione è una serata di gioco
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  session_number INT DEFAULT 1,
  title         TEXT,
  -- Stato corrente della sessione
  phase         TEXT DEFAULT 'lobby', -- lobby | exploration | combat | rest
  combat_state  JSONB DEFAULT NULL,   -- stato combattimento se attivo
  map_state     JSONB DEFAULT NULL,   -- stato mappa corrente
  -- Log della sessione
  event_log     JSONB DEFAULT '[]',
  -- Note del DM per questa sessione
  dm_notes      TEXT,
  -- Quando è iniziata/finita
  started_at    TIMESTAMPTZ DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── MAPPE ──
-- Mappe create dal DM
CREATE TABLE IF NOT EXISTS maps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  image_url     TEXT,              -- immagine di sfondo caricata
  grid_width    INT DEFAULT 20,    -- numero celle orizzontali
  grid_height   INT DEFAULT 15,    -- numero celle verticali
  cell_size     INT DEFAULT 50,    -- pixel per cella
  fog_of_war    JSONB DEFAULT '[]', -- celle visibili
  objects       JSONB DEFAULT '[]', -- oggetti/muri sulla mappa
  is_active     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── ENABLE REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE characters;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- ── RLS POLICIES ──
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- Accesso pubblico (il codice gestisce la sicurezza)
CREATE POLICY "public_campaigns" ON campaigns FOR ALL USING (true);
CREATE POLICY "public_characters" ON characters FOR ALL USING (true);
CREATE POLICY "public_sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "public_maps" ON maps FOR ALL USING (true);
