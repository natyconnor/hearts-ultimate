import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface GameResult {
  won: boolean;
  pointsTaken: number;
  shotTheMoon: boolean;
}

/**
 * Hook for recording game statistics.
 * Stats are recorded silently in the background - errors don't affect gameplay.
 * Only works for authenticated users (via Convex Auth).
 */
export function useGameStats() {
  const recordGameResultMutation = useMutation(api.stats.recordGameResult);

  const recordGameResult = useCallback(
    async (result: GameResult) => {
      try {
        // Call the Convex mutation to record stats
        // This will silently do nothing if user isn't authenticated
        await recordGameResultMutation({
          won: result.won,
          pointsTaken: result.pointsTaken,
          shotTheMoon: result.shotTheMoon,
        });
      } catch (err) {
        // Silently fail - stats are nice-to-have, not critical
        console.warn("Failed to record game stats:", err);
      }
    },
    [recordGameResultMutation]
  );

  return { recordGameResult };
}
