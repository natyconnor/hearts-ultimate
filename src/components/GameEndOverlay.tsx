import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw } from "lucide-react";
import type { Player } from "../types/game";

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
        className="relative max-w-lg w-full mx-4 overflow-hidden"
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
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    rank === 0
                      ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/20 border border-yellow-500/40"
                      : rank === 1
                      ? "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border border-gray-400/30"
                      : rank === 2
                      ? "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border border-amber-700/30"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        rank === 0
                          ? "bg-yellow-500 text-yellow-900"
                          : rank === 1
                          ? "bg-gray-400 text-gray-800"
                          : rank === 2
                          ? "bg-amber-700 text-amber-100"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {rank + 1}
                    </span>
                    <span className="font-medium text-white">
                      {item.player.name}
                      {item.player.isAI && (
                        <span className="ml-1 text-white/60">🤖</span>
                      )}
                    </span>
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      rank === 0 ? "text-yellow-300" : "text-white/80"
                    }`}
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
            <button
              onClick={onGoHome}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
            >
              <Home className="w-5 h-5" />
              Home
            </button>
            <button
              onClick={onNewGame}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/30"
            >
              <RotateCcw className="w-5 h-5" />
              {isLoading ? "Starting..." : "New Game"}
            </button>
          </motion.div>
        </div>

        {/* Confetti-like decorations */}
        {[...Array(12)].map((_, i) => (
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
              x: `${50 + (Math.random() - 0.5) * 100}%`,
              y: `${50 + (Math.random() - 0.5) * 100}%`,
            }}
            transition={{
              duration: 1.5,
              delay: 0.2 + i * 0.05,
              ease: "easeOut",
            }}
            className={`absolute w-3 h-3 rounded-full ${
              ["bg-yellow-400", "bg-amber-400", "bg-orange-400", "bg-red-400"][
                i % 4
              ]
            }`}
            style={{
              left: 0,
              top: 0,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
