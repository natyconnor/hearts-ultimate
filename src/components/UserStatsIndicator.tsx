import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { AccountLinkModal } from "./AccountLinkModal";

/**
 * A tiny, unintrusive stats display.
 * Only shows after user has played at least one game.
 * Shows a subtle "save stats" hint for anonymous users.
 */
export function UserStatsIndicator() {
  const { stats, isLoading, isAnonymous } = useAuth();
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Don't show anything while loading or if no games played
  if (isLoading || !stats || stats.games_played === 0) {
    return null;
  }

  const winRate =
    stats.games_played > 0
      ? Math.round((stats.games_won / stats.games_played) * 100)
      : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center"
      >
        <div className="text-xs text-white/40 space-x-3">
          <span>{stats.games_played} games</span>
          <span>•</span>
          <span>{stats.games_won} wins ({winRate}%)</span>
          {stats.moons_shot > 0 && (
            <>
              <span>•</span>
              <span>🌙 {stats.moons_shot}</span>
            </>
          )}
          {isAnonymous && (
            <>
              <span>•</span>
              <button
                onClick={() => setShowAccountModal(true)}
                className="text-emerald-400/60 hover:text-emerald-400 transition-colors underline decoration-dotted underline-offset-2"
              >
                Save stats?
              </button>
            </>
          )}
        </div>
      </motion.div>

      <AccountLinkModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </>
  );
}
