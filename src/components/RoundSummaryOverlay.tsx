import { motion } from "framer-motion";
import { ChevronRight, Moon, Heart } from "lucide-react";
import type { Player, Card } from "../types/game";
import { Card as CardComponent } from "./Card";

interface RoundSummaryOverlayProps {
  players: Player[];
  roundNumber: number;
  roundScores: number[];
  totalScores: number[];
  shotTheMoon?: { playerIndex: number } | null;
  pointsCardsTaken?: Card[][]; // Penalty cards (points cards) taken by each player
  onNextRound: () => void;
  isLoading?: boolean;
}

export function RoundSummaryOverlay({
  players,
  roundNumber,
  roundScores,
  totalScores,
  shotTheMoon,
  pointsCardsTaken,
  onNextRound,
  isLoading,
}: RoundSummaryOverlayProps) {
  // Find who scored the most this round (not great in Hearts!)
  const maxRoundScore = Math.max(...roundScores);
  const minRoundScore = Math.min(...roundScores);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(148,163,184,0.1),transparent_50%)]" />

        {/* Content */}
        <div className="relative p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full mb-3">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-white/80">
                Round {roundNumber} Complete
              </span>
            </div>

            {shotTheMoon && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="flex items-center justify-center gap-2 text-purple-300 mt-2"
              >
                <Moon className="w-5 h-5" />
                <span className="font-bold">
                  {players[shotTheMoon.playerIndex].name} shot the moon!
                </span>
                <Moon className="w-5 h-5" />
              </motion.div>
            )}
          </motion.div>

          {/* Score table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-black/30 rounded-xl overflow-hidden mb-6"
          >
            {/* Table header */}
            <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="text-sm font-semibold text-white/60">Player</div>
              <div className="text-sm font-semibold text-white/60 text-center">
                Round
              </div>
              <div className="text-sm font-semibold text-white/60 text-right">
                Total
              </div>
            </div>

            {/* Player rows */}
            {players.map((player, index) => {
              const roundScore = roundScores[index];
              const totalScore = totalScores[index];
              const isWorst = roundScore === maxRoundScore && maxRoundScore > 0;
              const isBest =
                roundScore === minRoundScore && minRoundScore < maxRoundScore;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.08 }}
                  className={`grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/5 last:border-b-0 ${
                    isWorst ? "bg-red-500/10" : isBest ? "bg-green-500/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {player.name}
                    </span>
                    {player.isAI && (
                      <span className="text-white/50 text-xs">🤖</span>
                    )}
                  </div>
                  <div className="text-center">
                    <span
                      className={`font-bold ${
                        roundScore === 0
                          ? "text-green-400"
                          : roundScore >= 13
                          ? "text-red-400"
                          : "text-white"
                      }`}
                    >
                      {roundScore > 0 ? `+${roundScore}` : roundScore}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold ${
                        totalScore >= 80
                          ? "text-red-400"
                          : totalScore >= 50
                          ? "text-yellow-400"
                          : "text-white"
                      }`}
                    >
                      {totalScore}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Points Cards Taken Section */}
          {pointsCardsTaken &&
            pointsCardsTaken.some((cards) => cards.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-black/30 rounded-xl overflow-hidden mb-6"
              >
                <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                  <div className="text-sm font-semibold text-white/60">
                    Cards Taken
                  </div>
                </div>
                {players.map((player, index) => {
                  const playerCards = pointsCardsTaken[index] || [];
                  if (playerCards.length === 0) return null;

                  return (
                    <motion.div
                      key={`cards-${player.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + index * 0.05 }}
                      className="px-4 py-3 border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-white/70">
                          {player.name}
                          {player.isAI && " 🤖"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {playerCards.map((card: Card, cardIdx: number) => (
                          <motion.div
                            key={`${card.suit}-${card.rank}-${cardIdx}`}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              delay: 0.5 + index * 0.05 + cardIdx * 0.03,
                              type: "spring",
                              stiffness: 200,
                              damping: 20,
                            }}
                          >
                            <CardComponent
                              suit={card.suit}
                              rank={card.rank}
                              isMini={true}
                              className="w-10 h-14 md:w-12 md:h-16"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

          {/* Progress indicator - how close to game end */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Game progress</span>
              <span>100 points to end</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    (Math.max(...totalScores) / 100) * 100
                  )}%`,
                }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className={`h-full rounded-full ${
                  Math.max(...totalScores) >= 80
                    ? "bg-gradient-to-r from-red-500 to-red-400"
                    : Math.max(...totalScores) >= 50
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                    : "bg-gradient-to-r from-green-500 to-green-400"
                }`}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-white/50">
                Highest: {Math.max(...totalScores)} pts
              </span>
              <span className="text-white/50">
                Lowest: {Math.min(...totalScores)} pts
              </span>
            </div>
          </motion.div>

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNextRound}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30 cursor-pointer"
          >
            {isLoading ? (
              "Dealing cards..."
            ) : (
              <>
                Next Round
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
