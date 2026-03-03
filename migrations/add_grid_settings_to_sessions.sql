-- Migration: Add grid settings columns to sessions table
-- Created: 2026-03-01
-- Purpose: Persist BattleGrid settings (cell size, opacity, visibility)

-- Add grid_cell_size column (default 50px)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS grid_cell_size INTEGER DEFAULT 50;

-- Add grid_opacity column (default 0.15)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS grid_opacity REAL DEFAULT 0.15;

-- Add grid_visible column (default true)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS grid_visible BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN sessions.grid_cell_size IS 'Size of battle grid cells in pixels (affects token size)';
COMMENT ON COLUMN sessions.grid_opacity IS 'Opacity of grid lines (0-1)';
COMMENT ON COLUMN sessions.grid_visible IS 'Whether grid is visible on battle map';
