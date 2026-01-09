CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  game_state JSONB NOT NULL,
  status TEXT DEFAULT 'waiting'
);

CREATE INDEX idx_game_rooms_slug ON game_rooms(slug);