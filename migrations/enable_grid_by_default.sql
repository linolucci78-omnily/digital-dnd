-- ═══════════════════════════════════════════════════════════
--  ENABLE GRID BY DEFAULT - Essential for token movement!
-- ═══════════════════════════════════════════════════════════

-- Update default grid size to 140px (Roll20 standard 70px × 2 for larger canvas)
-- Enable grid by default so players can see it on TV for token movement

UPDATE scenes
SET canvas_state = jsonb_set(
  jsonb_set(
    canvas_state,
    '{gridSettings,enabled}',
    'true'
  ),
  '{gridSettings,size}',
  '140'
)
WHERE canvas_state->'gridSettings'->>'enabled' = 'false';

-- Update the default for new scenes
ALTER TABLE scenes
  ALTER COLUMN canvas_state SET DEFAULT '{
    "layers": {
      "map": {"visible": true, "locked": false, "objects": []},
      "objects": {"visible": true, "locked": false, "objects": []},
      "tokens": {"visible": true, "locked": false, "objects": []},
      "gm": {"visible": true, "locked": false, "objects": []}
    },
    "gridSettings": {
      "enabled": true,
      "type": "square",
      "size": 140,
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

-- ═══════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════
-- This enables:
-- 1. Grid visible by default on TV for players
-- 2. Updated grid size to 140px (better visibility)
-- 3. All existing scenes now have grid enabled
-- ═══════════════════════════════════════════════════════════
