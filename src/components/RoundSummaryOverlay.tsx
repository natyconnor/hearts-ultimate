import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  Moon,
  Heart,
  Sparkles,
  Star,
  History,
} from "lucide-react";
import type { Player, Card, RoundScoreRecord } from "../types/game";
import { Card as CardComponent } from "./Card";
import { cn } from "../lib/utils";
import { DifficultyBadgeIcon } from "./DifficultyBadge";
import {
  getScoreColor,
  getProgressBarColor,
  buttonClasses,
} from "../lib/styles";
import { useEffect, useState } from "react";
import { playSound } from "../lib/sounds";
import { GAME_CONFIG } from "../lib/constants";

interface RoundSummaryOverlayProps {
  players: Player[];
  roundNumber: number;
  roundScores: number[];
  totalScores: number[];
  shotTheMoon?: { playerIndex: number } | null;
  pointsCardsTaken?: Card[][]; // Penalty cards (points cards) taken by each player
  roundHistory?: RoundScoreRecord[]; // History of all rounds played so far
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
  roundHistory,
  onNextRound,
  isLoading,
}: RoundSummaryOverlayProps) {
  // Find who scored the most this round (not great in Hearts!)
  const maxRoundScore = Math.max(...roundScores);
  const minRoundScore = Math.min(...roundScores);

  // State for collapsible sections
  const [showPointsTaken, setShowPointsTaken] = useState(false);
  const [showRoundHistory, setShowRoundHistory] = useState(false);

  // Play moon sound effect when someone shoots the moon
  useEffect(() => {
    if (shotTheMoon) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        playSound("shootTheMoon");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shotTheMoon]);

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
        className="relative max-w-md w-full mx-4 max-h-[90vh] overflow-hidden rounded-2xl"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(148,163,184,0.1),transparent_50%)]" />

        {/* Content - Scrollable */}
        <div className="relative p-6 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
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
              <MoonCelebration
                playerName={players[shotTheMoon.playerIndex].name}
              />
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
                  className={cn(
                    // Layout & spacing
                    "grid grid-cols-3 gap-2 px-4 py-3",
                    "border-b border-white/5 last:border-b-0",
                    // Conditional background
                    isWorst && "bg-red-500/10",
                    isBest && "bg-green-500/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {player.name}
                    </span>
                    {player.isAI && (
                      <>
                        <span className="text-white/50 text-xs">🤖</span>
                        <DifficultyBadgeIcon difficulty={player.difficulty} />
                      </>
                    )}
                  </div>
                  <div className="text-center">
                    <span
                      className={cn(
                        "font-bold",
                        getScoreColor(roundScore, "round")
                      )}
                    >
                      {roundScore > 0 ? `+${roundScore}` : roundScore}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "font-bold",
                        getScoreColor(totalScore, "total")
                      )}
                    >
                      {totalScore}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Points Cards Taken Section - Collapsible */}
          {pointsCardsTaken &&
            pointsCardsTaken.some((cards) => cards.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-black/30 rounded-xl overflow-hidden mb-6"
              >
                {/* Collapsible Header */}
                <button
                  onClick={() => setShowPointsTaken(!showPointsTaken)}
                  className="w-full px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-white/60">
                      Points Taken
                    </span>
                    <span className="text-xs text-white/40">
                      (
                      {pointsCardsTaken.reduce(
                        (sum, cards) => sum + cards.length,
                        0
                      )}{" "}
                      cards)
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: showPointsTaken ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  </motion.div>
                </button>

                {/* Collapsible Content */}
                <AnimatePresence>
                  {showPointsTaken && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {players.map((player, index) => {
                        const playerCards = pointsCardsTaken[index] || [];
                        if (playerCards.length === 0) return null;

                        return (
                          <div
                            key={`cards-${player.id}`}
                            className="px-4 py-3 border-b border-white/5 last:border-b-0"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-white/70">
                                {player.name}
                              </span>
                              {player.isAI && (
                                <>
                                  <span className="text-white/50 text-xs">
                                    🤖
                                  </span>
                                  <DifficultyBadgeIcon
                                    difficulty={player.difficulty}
                                  />
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {playerCards.map(
                                (card: Card, cardIdx: number) => (
                                  <CardComponent
                                    key={`${card.suit}-${card.rank}-${cardIdx}`}
                                    suit={card.suit}
                                    rank={card.rank}
                                    isMini={true}
                                    className="w-10 h-14 md:w-12 md:h-16"
                                  />
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          {/* Round History Section - Collapsible */}
          {roundHistory && roundHistory.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-black/30 rounded-xl overflow-hidden mb-6"
            >
              {/* Collapsible Header */}
              <button
                onClick={() => setShowRoundHistory(!showRoundHistory)}
                className="w-full px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-white/60" />
                  <span className="text-sm font-semibold text-white/60">
                    Score History
                  </span>
                  <span className="text-xs text-white/40">
                    ({roundHistory.length} rounds)
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: showRoundHistory ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </motion.div>
              </button>

              {/* Collapsible Content - Score Table */}
              <AnimatePresence>
                {showRoundHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        {/* Table Header - Round numbers */}
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="px-3 py-2 text-left text-white/50 font-medium sticky left-0 bg-slate-900/90">
                              Player
                            </th>
                            {roundHistory.map((round) => (
                              <th
                                key={round.roundNumber}
                                className="px-2 py-2 text-center text-white/50 font-medium min-w-[40px]"
                              >
                                R{round.roundNumber}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        {/* Table Body - Player scores per round */}
                        <tbody>
                          {players.map((player, playerIdx) => (
                            <tr
                              key={player.id}
                              className="border-b border-white/5 last:border-b-0"
                            >
                              <td className="px-3 py-2 sticky left-0 bg-slate-900/90">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white/80 truncate max-w-[80px]">
                                    {player.name}
                                  </span>
                                  {player.isAI && (
                                    <>
                                      <span className="text-white/50 text-xs">
                                        🤖
                                      </span>
                                      <DifficultyBadgeIcon
                                        difficulty={player.difficulty}
                                      />
                                    </>
                                  )}
                                </div>
                              </td>
                              {roundHistory.map((round) => {
                                const score = round.scores[playerIdx];
                                const shotMoon =
                                  round.shotTheMoon?.playerIndex === playerIdx;
                                return (
                                  <td
                                    key={round.roundNumber}
                                    className="px-2 py-2 text-center"
                                  >
                                    <span
                                      className={cn(
                                        "font-mono text-xs",
                                        score === 0 && "text-green-400/70",
                                        score > 0 &&
                                          score < 10 &&
                                          "text-yellow-400/80",
                                        score >= 10 &&
                                          score < 20 &&
                                          "text-orange-400",
                                        score >= 20 && "text-red-400",
                                        shotMoon && "text-purple-400"
                                      )}
                                      title={
                                        shotMoon ? "Shot the moon!" : undefined
                                      }
                                    >
                                      {shotMoon && "🌙"}
                                      {score}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
              <span>{GAME_CONFIG.GAME_END_SCORE} points to end</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    (Math.max(...totalScores) / GAME_CONFIG.GAME_END_SCORE) *
                      100
                  )}%`,
                }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className={getProgressBarColor(Math.max(...totalScores))}
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
            className={cn(buttonClasses("blue"), "w-full py-4")}
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

/**
 * Spectacular moon shooting celebration animation
 */
function MoonCelebration({ playerName }: { playerName: string }) {
  // Generate random particles for the celebration (using useState lazy initializer to avoid calling Math.random during render)
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i / 20) * 360,
      delay: i * 0.05,
      distance: 80 + Math.random() * 40,
    }))
  );

  const [stars] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 150,
      delay: 0.5 + Math.random() * 0.5,
      scale: 0.5 + Math.random() * 0.5,
    }))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative mt-4 mb-2"
    >
      {/* Glowing background pulse */}
      <motion.div
        className="absolute inset-0 -inset-x-20 -inset-y-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.1, 0.3, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="absolute inset-0 bg-gradient-radial from-purple-500/30 via-purple-500/10 to-transparent rounded-full blur-xl" />
      </motion.div>

      {/* Floating stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute left-1/2 top-1/2 text-yellow-300"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, star.scale, 0],
            x: star.x,
            y: star.y,
          }}
          transition={{
            duration: 1.5,
            delay: star.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <Star className="w-4 h-4 fill-current" />
        </motion.div>
      ))}

      {/* Particle burst */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-2 h-2"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
            y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 1,
            delay: 0.3 + particle.delay,
            ease: "easeOut",
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-500" />
        </motion.div>
      ))}

      {/* Main celebration content */}
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
      >
        {/* Moon icon with glow */}
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="absolute inset-0 blur-lg bg-purple-400/50 rounded-full scale-150" />
          <Moon className="relative w-12 h-12 text-purple-300 fill-purple-400/30" />
        </motion.div>

        {/* Text announcement */}
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="flex items-center justify-center gap-2 mb-1"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              SHOT THE MOON!
            </span>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </motion.div>
          <motion.p
            className="text-purple-200 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {playerName} collected all 26 points!
          </motion.p>
          <motion.p
            className="text-purple-300/70 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            Everyone else gets +26 points
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
