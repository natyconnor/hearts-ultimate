import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw } from "lucide-react";
import type { Player, AIDifficulty } from "../types/game";
import { cn } from "../lib/utils";
import {
  buttonClasses,
  getRankBadgeClasses,
  getRankRowClasses,
} from "../lib/styles";

interface GameEndOverlayProps {
  players: Player[];
  scores: number[];
  winnerIndex: number;
  onNewGame: () => void;
  onGoHome: () => void;
  isLoading?: boolean;
}

export function GameEndOverlay({
  players,
  scores,
  winnerIndex,
  onNewGame,
  onGoHome,
  isLoading,
}: GameEndOverlayProps) {
  // Sort players by score (ascending - lowest score wins in Hearts)
  const sortedPlayers = players
    .map((player, index) => ({
      player,
      score: scores[index],
      originalIndex: index,
    }))
    .sort((a, b) => a.score - b.score);

  const winner = players[winnerIndex];

  // Helper function to get difficulty badge info
  const getDifficultyBadge = (difficulty: AIDifficulty | undefined) => {
    if (!difficulty) return null;
    const badges = {
      easy: {
        icon: "🌱",
        label: "Easy",
        color: "bg-green-500/20 border-green-500/40 text-green-200",
      },
      medium: {
        icon: "⚡",
        label: "Medium",
        color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-200",
      },
      hard: {
        icon: "🧠",
        label: "Hard",
        color: "bg-purple-500/20 border-purple-500/40 text-purple-200",
      },
    };
    return badges[difficulty];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-lg w-full mx-4 overflow-hidden rounded-3xl"
      >
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 rounded-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.3),transparent_50%)]" />

        {/* Content */}
        <div className="relative p-8">
          {/* Winner celebration */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center mb-8"
          >
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.6,
                delay: 0.4,
                repeat: 2,
              }}
            >
              <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-3xl font-bold text-white tracking-tight"
            >
              Game Over!
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-2 flex items-center gap-2"
            >
              <span className="text-xl text-amber-200">🎉</span>
              <span className="text-xl font-semibold text-yellow-300">
                {winner.name} wins!
              </span>
              <span className="text-xl text-amber-200">🎉</span>
            </motion.div>
          </motion.div>

          {/* Final standings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black/30 rounded-2xl p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-white/80 mb-4 text-center">
              Final Standings
            </h2>

            <div className="space-y-3">
              {sortedPlayers.map((item, rank) => (
                <motion.div
                  key={item.player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + rank * 0.1 }}
                  className={getRankRowClasses(rank)}
                >
                  <div className="flex items-center gap-3">
                    <span className={getRankBadgeClasses(rank)}>
                      {rank + 1}
                    </span>
                    <span className="font-medium text-white">
                      {item.player.name}
                    </span>
                    {item.player.isAI && (
                      <>
                        <span className="text-white/60">🤖</span>
                        {getDifficultyBadge(item.player.difficulty) && (
                          <div
                            className={cn(
                              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm border",
                              getDifficultyBadge(item.player.difficulty)?.color
                            )}
                            title={
                              getDifficultyBadge(item.player.difficulty)?.label
                            }
                          >
                            <span>
                              {getDifficultyBadge(item.player.difficulty)?.icon}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-bold text-lg",
                      rank === 0 ? "text-yellow-300" : "text-white/80"
                    )}
                  >
                    {item.score} pts
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex gap-4"
          >
            <motion.button
              onClick={onGoHome}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(buttonClasses("secondary"), "flex-1")}
            >
              <Home className="w-5 h-5" />
              Home
            </motion.button>
            <motion.button
              onClick={onNewGame}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(buttonClasses("primary"), "flex-1")}
            >
              <RotateCcw className="w-5 h-5" />
              {isLoading ? "Starting..." : "New Game"}
            </motion.button>
          </motion.div>
        </div>

        {/* Confetti-like decorations */}
        {[...Array(12)].map((_, i) => {
          // Pre-calculate random positions to avoid calling Math.random during render
          const randomX = 50 + Math.sin(i * 0.5) * 50;
          const randomY = 50 + Math.cos(i * 0.7) * 50;

          return (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                scale: 0,
                x: "50%",
                y: "50%",
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: `${randomX}%`,
                y: `${randomY}%`,
              }}
              transition={{
                duration: 1.5,
                delay: 0.2 + i * 0.05,
                ease: "easeOut",
              }}
              className={cn(
                "absolute w-3 h-3 rounded-full",
                [
                  "bg-yellow-400",
                  "bg-amber-400",
                  "bg-orange-400",
                  "bg-red-400",
                ][i % 4]
              )}
              style={{
                left: 0,
                top: 0,
              }}
            />
          );
        })}
      </motion.div>
    </motion.div>
  );
}
