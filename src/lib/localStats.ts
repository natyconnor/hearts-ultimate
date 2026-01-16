/**
 * Local Stats Storage
 *
 * Tracks game statistics in localStorage for anonymous users.
 * When a user signs up, these can be migrated to their account.
 */

import type { UserStats } from "../contexts/authContextDef";

const LOCAL_STATS_KEY = "hearts_local_stats";

export function getLocalStats(): UserStats | null {
  try {
    const stored = localStorage.getItem(LOCAL_STATS_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserStats;
  } catch {
    return null;
  }
}

export function saveLocalStats(stats: UserStats): void {
  try {
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage might be full or disabled
  }
}

export function clearLocalStats(): void {
  try {
    localStorage.removeItem(LOCAL_STATS_KEY);
  } catch {
    // ignore
  }
}

export function recordLocalGameResult(result: {
  won: boolean;
  pointsTaken: number;
  shotTheMoon: boolean;
}): UserStats {
  const existing = getLocalStats() ?? {
    gamesPlayed: 0,
    gamesWon: 0,
    totalPointsTaken: 0,
    moonsShot: 0,
  };

  const updated: UserStats = {
    gamesPlayed: existing.gamesPlayed + 1,
    gamesWon: existing.gamesWon + (result.won ? 1 : 0),
    totalPointsTaken: existing.totalPointsTaken + result.pointsTaken,
    moonsShot: existing.moonsShot + (result.shotTheMoon ? 1 : 0),
  };

  saveLocalStats(updated);
  return updated;
}
