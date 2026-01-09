import { motion, AnimatePresence } from "framer-motion";
import { Heart, Info } from "lucide-react";
import { isFirstTrick, isTwoOfClubs } from "../game/rules";
import type { GameState, Card } from "../types/game";

interface GameIndicatorsProps {
  gameState: GameState | null;
  playerHand: Card[];
}

export function GameIndicators({ gameState, playerHand }: GameIndicatorsProps) {
  return (
    <div className="mb-2 flex flex-col items-center gap-1.5 z-30">
      {/* Hearts Broken Indicator */}
      <AnimatePresence>
        {gameState?.heartsBroken && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-500/40 shadow-lg shadow-red-500/20"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </motion.div>
              <span className="text-red-200 font-semibold text-xs tracking-wide">
                Hearts Broken
              </span>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4,
                }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Pass Round Indicator - First Trick */}
      <AnimatePresence>
        {gameState &&
          gameState.passDirection === "none" &&
          isFirstTrick(gameState) && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-500/40 shadow-lg shadow-blue-500/20">
                <Info className="w-4 h-4 text-blue-300" />
                <span className="text-blue-200 font-semibold text-xs tracking-wide whitespace-nowrap">
                  No Pass Round
                  {playerHand.some(isTwoOfClubs) && " - Play 2♣ to start"}
                </span>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
