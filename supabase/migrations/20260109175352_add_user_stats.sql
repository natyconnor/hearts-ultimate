-- User statistics table (automatically populated for all users, including anonymous)
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_points_taken INTEGER DEFAULT 0,  -- Lower is better in Hearts
  moons_shot INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own stats
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to increment game stats (upserts - creates row if doesn't exist)
CREATE OR REPLACE FUNCTION increment_game_stats(
  p_user_id UUID,
  p_won BOOLEAN,
  p_points_taken INTEGER,
  p_shot_moon BOOLEAN
) RETURNS void AS $$
BEGIN
  INSERT INTO user_stats (user_id, games_played, games_won, total_points_taken, moons_shot)
  VALUES (
    p_user_id,
    1,
    CASE WHEN p_won THEN 1 ELSE 0 END,
    p_points_taken,
    CASE WHEN p_shot_moon THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    games_played = user_stats.games_played + 1,
    games_won = user_stats.games_won + CASE WHEN p_won THEN 1 ELSE 0 END,
    total_points_taken = user_stats.total_points_taken + p_points_taken,
    moons_shot = user_stats.moons_shot + CASE WHEN p_shot_moon THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
