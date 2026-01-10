export const STORAGE_KEYS = {
  PLAYER_ID: "hearts-player-id",
  PLAYER_NAME: "hearts-player-name",
  AI_DIFFICULTY: "hearts-ai-difficulty",
  SOUND_ENABLED: "hearts-sound-enabled",
  SOUND_VOLUME: "hearts-sound-volume",
  SPECTATOR_ID: "hearts-spectator-id",
  SPECTATOR_NAME: "hearts-spectator-name",
} as const;

export const GAME_CONFIG = {
  MAX_PLAYERS: 4,
  CARDS_PER_PLAYER: 13,
  TOTAL_CARDS: 52,
  GAME_END_SCORE: 100, // Game ends when any player reaches this score or higher
} as const;
