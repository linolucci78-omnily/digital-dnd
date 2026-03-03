-- ═══════════════════════════════════════════════════════════
--  CANVAS STATE SYSTEM - Better than Roll20!
--  Real-time synchronized canvas between DM and players
-- ═══════════════════════════════════════════════════════════

-- Add canvas_state column to store complete canvas configuration
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS canvas_state JSONB DEFAULT '{
    "layers": {
      "map": {"visible": true, "locked": false, "objects": []},
      "objects": {"visible": true, "locked": false, "objects": []},
      "tokens": {"visible": true, "locked": false, "objects": []},
      "gm": {"visible": true, "locked": false, "objects": []}
    },
    "gridSettings": {
      "enabled": false,
      "type": "square",
      "size": 100,
      "color": "#d4af37",
      "opacity": 0.45,
      "snapToGrid": false,
      "offsetX": 0,
      "offsetY": 0,
      "scale": 5,
      "scaleUnit": "ft"
    },
    "pageSettings": {
      "backgroundColor": "#1a1410",
      "mapImage": null,
      "pageWidth": 25,
      "pageHeight": 25,
      "fogOfWar": {
        "enabled": false,
        "revealedAreas": []
      }
    }
  }'::jsonb;

-- Add index for faster canvas_state queries
CREATE INDEX IF NOT EXISTS idx_scenes_canvas_state ON scenes USING GIN (canvas_state);

-- Add updated_by column to track who made the last change
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Comments for documentation
COMMENT ON COLUMN scenes.canvas_state IS 'Complete canvas state: layers with all objects, grid settings, fog of war, page settings. Synchronized in real-time between DM and players.';
COMMENT ON COLUMN scenes.updated_by IS 'User who made the last update (DM email or "system")';

-- ═══════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════
-- This enables:
-- 1. Full canvas synchronization (better than Roll20!)
-- 2. Real-time updates of token positions
-- 3. Real-time fog of war reveals
-- 4. Grid alignment preserved across sessions
-- 5. Complete scene history and rollback capability
-- ═══════════════════════════════════════════════════════════
