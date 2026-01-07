import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./Card";
import type { Card as CardType, Player, PassDirection } from "../types/game";
import { cn } from "../lib/utils";
import {
  getPassDirectionLabel,
  getPassDirectionEmoji,
  getPassTargetIndex,
  isCardSelected,
} from "../game/passingLogic";
import {
  calculateCardHandLayout,
  calculateCardPosition,
} from "../game/cardDisplay";

interface PassingPhaseOverlayProps {
  players: Player[];
  currentPlayerIndex: number;
  passDirection: PassDirection;
  selectedCards: CardType[];
  onCardToggle: (card: CardType) => void;
  onConfirmPass: () => void;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  waitingForPlayers: string[]; // Names of players still selecting
}

export function PassingPhaseOverlay({
  players,
  currentPlayerIndex,
  passDirection,
  selectedCards,
  onCardToggle,
  onConfirmPass,
  isSubmitting,
  hasSubmitted,
  waitingForPlayers,
}: PassingPhaseOverlayProps) {
  const currentPlayer = players[currentPlayerIndex];
  const hand = currentPlayer?.hand || [];
  const targetPlayerIndex = getPassTargetIndex(
    currentPlayerIndex,
    passDirection
  );
  const targetPlayer = players[targetPlayerIndex];

  const cardCount = hand.length;
  const layoutConfig = calculateCardHandLayout(cardCount, {
    maxRotationMultiplier: 1.5,
    maxRotationCap: 20,
    spacingDivisor: 650,
    maxSpacing: 55,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
    >
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-4">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {getPassDirectionEmoji(passDirection)}{" "}
            {getPassDirectionLabel(passDirection)}
          </h2>
          <p className="text-lg text-white/80">
            Select 3 cards to pass to{" "}
            <span className="font-semibold text-amber-300">
              {targetPlayer?.name}
              {targetPlayer?.isAI && " 🤖"}
            </span>
          </p>
        </motion.div>

        {/* Selection indicator */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 bg-white/10 rounded-full px-6 py-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: selectedCards.length > i ? 1.1 : 1,
                  backgroundColor:
                    selectedCards.length > i
                      ? "rgb(34, 197, 94)"
                      : "rgba(255, 255, 255, 0.2)",
                }}
                className="w-4 h-4 rounded-full transition-colors"
              />
            ))}
            <span className="text-white font-medium ml-2">
              {selectedCards.length}/3 cards selected
            </span>
          </div>
        </motion.div>

        {/* Player's hand - interactive card selection */}
        {!hasSubmitted ? (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative flex items-end justify-center mb-8"
            style={{
              height: "clamp(200px, 20vh, 260px)",
              width: `${Math.max(600, layoutConfig.totalWidth + 150)}px`,
              maxWidth: "95vw",
            }}
          >
            {hand.map((card, index) => {
              const position = calculateCardPosition(
                index,
                cardCount,
                layoutConfig,
                { yOffsetMultiplier: 3 }
              );

              const isSelected = isCardSelected(card, selectedCards);
              const canSelect = selectedCards.length < 3 || isSelected;

              return (
                <motion.div
                  key={`${card.suit}-${card.rank}`}
                  layout
                  className={cn(
                    "absolute transition-all duration-150 ease-out",
                    canSelect
                      ? "cursor-pointer hover:scale-110"
                      : "cursor-not-allowed opacity-60"
                  )}
                  style={{
                    left: `calc(50% + ${position.xOffset}px)`,
                    bottom: `${position.yOffset}px`,
                    transform: `translateX(-50%) rotate(${position.rotation}deg)`,
                    transformOrigin: "center bottom",
                    zIndex: index, // Maintain natural layering order
                  }}
                  animate={{
                    y: isSelected ? -40 : 0,
                    scale: isSelected ? 1.08 : 1,
                  }}
                  whileHover={
                    canSelect
                      ? {
                          scale: isSelected ? 1.08 : 1.05,
                          y: isSelected ? -40 : -10,
                        }
                      : {}
                  }
                  onClick={() => canSelect && onCardToggle(card)}
                >
                  <Card
                    suit={card.suit}
                    rank={card.rank}
                    className={cn(
                      "shadow-xl transition-all duration-150",
                      isSelected &&
                        "ring-4 ring-green-400 ring-offset-2 ring-offset-transparent"
                    )}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* Waiting state after submission */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center gap-2 text-green-400 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                ⏳
              </motion.div>
              <span className="text-lg font-medium">Cards submitted!</span>
            </div>

            {/* Show selected cards */}
            <div className="flex gap-3 justify-center mb-4">
              {selectedCards.map((card) => (
                <motion.div
                  key={`selected-${card.suit}-${card.rank}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <Card
                    suit={card.suit}
                    rank={card.rank}
                    className="w-16 h-24 md:w-20 md:h-28"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Selected cards preview and confirm button */}
        {!hasSubmitted && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Selected cards preview */}
            <AnimatePresence mode="popLayout">
              {selectedCards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-3 mb-2"
                >
                  <span className="text-white/60 text-sm self-center mr-2">
                    Passing:
                  </span>
                  {selectedCards.map((card) => (
                    <motion.div
                      key={`preview-${card.suit}-${card.rank}`}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <Card
                        suit={card.suit}
                        rank={card.rank}
                        className="w-12 h-16 md:w-14 md:h-20"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm button */}
            <motion.button
              whileHover={selectedCards.length === 3 ? { scale: 1.05 } : {}}
              whileTap={selectedCards.length === 3 ? { scale: 0.95 } : {}}
              onClick={onConfirmPass}
              disabled={selectedCards.length !== 3 || isSubmitting}
              className={cn(
                "px-8 py-3 rounded-xl font-semibold text-lg transition-all shadow-lg",
                selectedCards.length === 3
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-green-500/30"
                  : "bg-gray-600 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    ⏳
                  </motion.span>
                  Passing...
                </span>
              ) : (
                `Pass Cards ${getPassDirectionEmoji(passDirection)}`
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Waiting for other players */}
        {waitingForPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-white/60 text-sm">
              Waiting for:{" "}
              <span className="text-white/80">
                {waitingForPlayers.join(", ")}
              </span>
            </p>
          </motion.div>
        )}

        {/* Round info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-white/40 text-sm"
        >
          Round passing order: Left → Right → Across → Hold (repeat)
        </motion.div>
      </div>
    </motion.div>
  );
}
