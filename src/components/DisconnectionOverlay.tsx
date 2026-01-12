import { motion } from "framer-motion";
import { WifiOff, Clock, User } from "lucide-react";
import type { Player } from "../types/game";
import { cn } from "../lib/utils";
import { DifficultyBadgeIcon } from "./DifficultyBadge";
import { CONNECTION_CONFIG } from "../lib/constants";

interface DisconnectedPlayerInfo {
  player: Player;
  playerIndex: number;
  disconnectedAt: number;
  remainingTime: number;
}

interface DisconnectionOverlayProps {
  disconnectedPlayers: DisconnectedPlayerInfo[];
}

export function DisconnectionOverlay({
  disconnectedPlayers,
}: DisconnectionOverlayProps) {
  if (disconnectedPlayers.length === 0) return null;

  // Show the player with the least remaining time (most urgent)
  const mostUrgent = disconnectedPlayers.reduce((prev, curr) =>
    curr.remainingTime < prev.remainingTime ? curr : prev
  );

  const remainingSeconds = Math.ceil(mostUrgent.remainingTime / 1000);
  const totalSeconds = Math.ceil(CONNECTION_CONFIG.GRACE_PERIOD / 1000);
  const progress = mostUrgent.remainingTime / CONNECTION_CONFIG.GRACE_PERIOD;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-sm w-full mx-4 rounded-2xl overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/90 via-slate-900 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.15),transparent_50%)]" />

        {/* Content */}
        <div className="relative p-6">
          {/* Header with icon */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <WifiOff className="w-8 h-8 text-amber-400" />
            </motion.div>

            <h2 className="text-xl font-bold text-white mb-2">
              Player Disconnected
            </h2>
            <p className="text-white/60 text-sm">
              Waiting for player to reconnect...
            </p>
          </motion.div>

          {/* Disconnected player info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/30 rounded-xl p-4 mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                <User className="w-5 h-5 text-white/70" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {mostUrgent.player.name}
                  </span>
                  {mostUrgent.player.isAI && (
                    <>
                      <span className="text-white/50 text-xs">🤖</span>
                      <DifficultyBadgeIcon
                        difficulty={mostUrgent.player.difficulty}
                      />
                    </>
                  )}
                </div>
                <p className="text-white/50 text-sm">Lost connection</p>
              </div>
            </div>
          </motion.div>

          {/* Countdown timer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-4"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">Time remaining</span>
            </div>

            {/* Circular progress */}
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-white/10"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={cn(
                    progress > 0.5
                      ? "text-amber-400"
                      : progress > 0.25
                        ? "text-orange-400"
                        : "text-red-400"
                  )}
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 * (1 - progress)}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={cn(
                    "text-2xl font-bold",
                    progress > 0.5
                      ? "text-amber-400"
                      : progress > 0.25
                        ? "text-orange-400"
                        : "text-red-400"
                  )}
                >
                  {remainingSeconds}s
                </span>
              </div>
            </div>

            <p className="text-white/40 text-xs mt-3">
              Game will end if player doesn't reconnect within {totalSeconds}{" "}
              seconds
            </p>
          </motion.div>

          {/* Multiple disconnected players notice */}
          {disconnectedPlayers.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center"
            >
              <p className="text-red-300 text-sm">
                {disconnectedPlayers.length} players disconnected
              </p>
            </motion.div>
          )}

          {/* Pulsing indicator */}
          <motion.div
            className="flex items-center justify-center gap-2 mt-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-white/50 text-sm">
              Waiting for reconnection...
            </span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
