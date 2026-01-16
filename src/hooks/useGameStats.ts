import { useCallback } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { recordLocalGameResult } from "../lib/localStats";

interface GameResult {
  won: boolean;
  pointsTaken: number;
  shotTheMoon: boolean;
}

/**
 * Hook for recording game statistics.
 * - Authenticated users: saves to Convex database
 * - Anonymous users: saves to localStorage
 * Stats are recorded silently in the background - errors don't affect gameplay.
 */
export function useGameStats() {
  const { isAuthenticated } = useConvexAuth();
  const recordGameResultMutation = useMutation(api.stats.recordGameResult);

  const recordGameResult = useCallback(
    async (result: GameResult) => {
      try {
        if (isAuthenticated) {
          // Authenticated user: save to Convex
          await recordGameResultMutation({
            won: result.won,
            pointsTaken: result.pointsTaken,
            shotTheMoon: result.shotTheMoon,
          });
        } else {
          // Anonymous user: save to localStorage
          recordLocalGameResult(result);
        }
      } catch (err) {
        // Silently fail - stats are nice-to-have, not critical
        console.warn("Failed to record game stats:", err);
      }
    },
    [isAuthenticated, recordGameResultMutation]
  );

  return { recordGameResult };
}
