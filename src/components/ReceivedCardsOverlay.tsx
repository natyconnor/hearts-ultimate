import { motion } from "framer-motion";
import { Card } from "./Card";
import type { Card as CardType, Player, PassDirection } from "../types/game";
import { cn } from "../lib/utils";
import {
  getPassDirectionLabel,
  getPassDirectionEmoji,
  isCardSelected,
} from "../game/passingLogic";
import {
  calculateCardHandLayout,
  calculateCardPosition,
} from "../game/cardDisplay";

interface ReceivedCardsOverlayProps {
  players: Player[];
  currentPlayerIndex: number;
  passDirection: PassDirection;
  receivedCards: CardType[];
  onReady: () => void;
  isLoading: boolean;
  /** Whether this player has already confirmed they're ready */
  hasConfirmedReady: boolean;
  /** Names of human players still reviewing their cards */
  waitingForPlayers: string[];
}

export function ReceivedCardsOverlay({
  players,
  currentPlayerIndex,
  passDirection,
  receivedCards,
  onReady,
  isLoading,
  hasConfirmedReady,
  waitingForPlayers,
}: ReceivedCardsOverlayProps) {
  const currentPlayer = players[currentPlayerIndex];
  const hand = currentPlayer?.hand || [];

  // Find who passed to us
  const getFromPlayerIndex = () => {
    switch (passDirection) {
      case "left":
        return (currentPlayerIndex + 3) % 4; // Received from right
      case "right":
        return (currentPlayerIndex + 1) % 4; // Received from left
      case "across":
        return (currentPlayerIndex + 2) % 4; // Received from across
      default:
        return currentPlayerIndex;
    }
  };
  const fromPlayer = players[getFromPlayerIndex()];

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
          className="text-center mb-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.2,
            }}
            className="text-5xl mb-3"
          >
            🎁
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Cards Received!
          </h2>
          <p className="text-lg text-white/80">
            <span className="font-semibold text-amber-300">
              {fromPlayer?.name}
              {fromPlayer?.isAI && " 🤖"}
            </span>{" "}
            passed you 3 cards {getPassDirectionEmoji(passDirection)}
          </p>
          <p className="text-sm text-white/50 mt-1">
            ({getPassDirectionLabel(passDirection)})
          </p>
        </motion.div>

        {/* Received cards showcase */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="flex gap-4 mb-6"
        >
          {receivedCards.map((card, i) => (
            <motion.div
              key={`received-${card.suit}-${card.rank}`}
              initial={{ y: -50, opacity: 0, rotateY: 180 }}
              animate={{ y: 0, opacity: 1, rotateY: 0 }}
              transition={{
                delay: 0.4 + i * 0.15,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
            >
              <Card
                suit={card.suit}
                rank={card.rank}
                className={cn(
                  // Sizing
                  "w-20 h-28 md:w-24 md:h-34",
                  // Visual effects
                  "shadow-2xl ring-4 ring-amber-400/80 ring-offset-2 ring-offset-transparent"
                )}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/60 text-sm mb-6"
        >
          These cards are now highlighted in your hand ↓
        </motion.p>

        {/* Full hand with received cards highlighted */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative flex items-end justify-center mb-8"
          style={{
            height: "clamp(180px, 18vh, 240px)",
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

            const isReceived = isCardSelected(card, receivedCards);

            return (
              <motion.div
                key={`hand-${card.suit}-${card.rank}`}
                layout
                className="absolute"
                style={{
                  left: `calc(50% + ${position.xOffset}px)`,
                  bottom: `${position.yOffset}px`,
                  transform: `translateX(-50%) rotate(${position.rotation}deg)`,
                  transformOrigin: "center bottom",
                  zIndex: index, // Maintain natural layering order
                }}
                initial={{
                  y: isReceived ? -60 : 0,
                  scale: isReceived ? 1.1 : 1,
                }}
                animate={{
                  y: isReceived ? -30 : 0,
                  scale: isReceived ? 1.08 : 1,
                }}
                transition={{
                  delay: isReceived ? 0.6 + index * 0.05 : 0,
                  type: "spring",
                  stiffness: 200,
                  damping: 25,
                }}
              >
                <Card
                  suit={card.suit}
                  rank={card.rank}
                  className={cn(
                    "shadow-xl transition-all duration-300",
                    isReceived
                      ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent"
                      : "opacity-70"
                  )}
                />
                {isReceived && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-xs font-bold text-amber-900 shadow-lg"
                  >
                    ✨
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Ready button or waiting state */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {hasConfirmedReady ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-white/80 text-lg">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="text-2xl"
                >
                  ⏳
                </motion.span>
                <span>Waiting for other players...</span>
              </div>
              {waitingForPlayers.length > 0 && (
                <p className="text-white/50 text-sm">
                  {waitingForPlayers.join(", ")}{" "}
                  {waitingForPlayers.length === 1 ? "is" : "are"} still reviewing
                </p>
              )}
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReady}
              disabled={isLoading}
              className={cn(
                // Layout & spacing
                "px-10 py-4 rounded-xl",
                // Typography
                "font-semibold text-lg text-white",
                // Visual styling
                "bg-gradient-to-r from-green-500 to-emerald-600",
                "shadow-lg hover:shadow-xl hover:shadow-green-500/30",
                // Interactions
                "transition-all cursor-pointer",
                "disabled:opacity-50"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    ⏳
                  </motion.span>
                  Starting...
                </span>
              ) : (
                "Ready to Play! 🃏"
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Hint */}
        {!hasConfirmedReady && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-4 text-white/40 text-sm"
          >
            Click when you're ready to start the round
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
