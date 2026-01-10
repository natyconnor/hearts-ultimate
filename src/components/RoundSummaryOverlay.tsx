import { motion } from "framer-motion";
import { ChevronRight, Moon, Heart, Sparkles, Star } from "lucide-react";
import type { Player, Card } from "../types/game";
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
                        </span>
                        {player.isAI && (
                          <>
                            <span className="text-white/50 text-xs">🤖</span>
                            <DifficultyBadgeIcon
                              difficulty={player.difficulty}
                            />
                          </>
                        )}
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
