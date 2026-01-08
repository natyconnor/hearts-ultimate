export const STORAGE_KEYS = {
  PLAYER_ID: "hearts-player-id",
  PLAYER_NAME: "hearts-player-name",
  AI_DIFFICULTY: "hearts-ai-difficulty",
} as const;

export const GAME_CONFIG = {
  MAX_PLAYERS: 4,
  CARDS_PER_PLAYER: 13,
  TOTAL_CARDS: 52,
} as const;
