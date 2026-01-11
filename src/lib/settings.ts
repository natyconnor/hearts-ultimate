import { STORAGE_KEYS, AI_SPEED_RANGE } from "./constants";

/**
 * Get the stored AI speed from localStorage with validation.
 * Returns a valid speed between 0 and 1, or the default if invalid/missing.
 */
export function getStoredAISpeed(): number {
  const stored = localStorage.getItem(STORAGE_KEYS.AI_PLAY_SPEED);
  if (stored !== null) {
    const parsed = parseFloat(stored);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }
  return AI_SPEED_RANGE.DEFAULT_SPEED;
}
