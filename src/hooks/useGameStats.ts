import { useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

interface GameResult {
  won: boolean;
  pointsTaken: number;
  shotTheMoon: boolean;
}

/**
 * Hook for recording game statistics.
 * Stats are recorded silently in the background - errors don't affect gameplay.
 */
export function useGameStats() {
  const { user, refreshStats } = useAuth();

  const recordGameResult = useCallback(
    async (result: GameResult) => {
      if (!user) return; // Silently fail if no user (shouldn't happen)

      try {
        // Call the RPC function to increment stats
        const { error } = await supabase.rpc("increment_game_stats", {
          p_user_id: user.id,
          p_won: result.won,
          p_points_taken: result.pointsTaken,
          p_shot_moon: result.shotTheMoon,
        });

        if (error) {
          // Log but don't throw - stats are nice-to-have, not critical
          console.warn("Failed to record game stats:", error.message);
          return;
        }

        // Refresh stats in context so UI updates
        await refreshStats();
      } catch (err) {
        // Silently fail - don't interrupt the game experience
        console.warn("Failed to record game stats:", err);
      }
    },
    [user, refreshStats]
  );

  return { recordGameResult };
}
