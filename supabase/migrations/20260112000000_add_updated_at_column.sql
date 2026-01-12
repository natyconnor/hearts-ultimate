-- Add updated_at column to game_rooms table
ALTER TABLE game_rooms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows with created_at value
UPDATE game_rooms SET updated_at = created_at WHERE updated_at IS NULL;

-- Create a trigger function to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_game_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_game_rooms_updated_at ON game_rooms;
CREATE TRIGGER trigger_game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_game_rooms_updated_at();

-- Create an index on updated_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_game_rooms_updated_at ON game_rooms(updated_at);
