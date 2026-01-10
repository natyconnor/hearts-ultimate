export const STORAGE_KEYS = {
  PLAYER_ID: "hearts-player-id",
  PLAYER_NAME: "hearts-player-name",
  AI_DIFFICULTY: "hearts-ai-difficulty",
  SOUND_ENABLED: "hearts-sound-enabled",
  SOUND_VOLUME: "hearts-sound-volume",
  SPECTATOR_ID: "hearts-spectator-id",
  SPECTATOR_NAME: "hearts-spectator-name",
  AI_PLAY_SPEED: "hearts-ai-play-speed",
} as const;

// AI play speed: 0.0 (slowest) to 1.0 (fastest)
// Maps to delay in ms: 1500ms (slow) to 100ms (fast)
export const AI_SPEED_RANGE = {
  MIN_DELAY: 100,
  MAX_DELAY: 1500,
  DEFAULT_SPEED: 0.5, // ~800ms default
} as const;

export function getAIDelayFromSpeed(speed: number): number {
  // speed 0 = MAX_DELAY (slow), speed 1 = MIN_DELAY (fast)
  return Math.round(
    AI_SPEED_RANGE.MAX_DELAY -
      speed * (AI_SPEED_RANGE.MAX_DELAY - AI_SPEED_RANGE.MIN_DELAY)
  );
}

export const GAME_CONFIG = {
  MAX_PLAYERS: 4,
  CARDS_PER_PLAYER: 13,
  TOTAL_CARDS: 52,
  GAME_END_SCORE: 100, // Game ends when any player reaches this score or higher
} as const;
