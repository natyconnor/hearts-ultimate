-- Add spectators column to game_rooms table
ALTER TABLE game_rooms
ADD COLUMN spectators JSONB DEFAULT '[]'::jsonb;
