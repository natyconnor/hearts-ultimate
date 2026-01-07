import { motion } from "framer-motion";
import { CardHand } from "./CardHand";
import { Card } from "./Card";
import type { Card as CardType, Player, GameState } from "../types/game";
import { cn } from "../lib/utils";
import { getValidCards, isFirstTrick } from "../game/rules";
import {
  getTrickCardPosition,
  getPlayerStartPosition,
  getWinnerPosition,
} from "../game/cardDisplay";

interface GameTableProps {
  players: Player[];
  currentPlayerId: string | null;
  currentTrick: Array<{ playerId: string; card: CardType }>;
  gameState: GameState | null;
  selectedCard?: CardType | null;
  showCompletedTrick?: boolean;
  animatingToWinner?: boolean;
  cardHandRef?: React.RefObject<HTMLDivElement | null>;
  onCardClick?: (card: CardType, index: number) => void;
  className?: string;
}

export function GameTable({
  players,
  currentPlayerId,
  currentTrick,
  gameState,
  selectedCard,
  showCompletedTrick,
  animatingToWinner,
  cardHandRef,
  onCardClick,
  className,
}: GameTableProps) {
  // Get player at each position
  const getPlayerAtPosition = (index: number): Player | null => {
    return players[index] || null;
  };

  // Get current player's index
  const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);

  // Get valid cards for current player
  const currentPlayer =
    currentPlayerIndex >= 0 ? players[currentPlayerIndex] : null;
  const validCards =
    gameState &&
    currentPlayer &&
    currentPlayerIndex === gameState.currentPlayerIndex
      ? getValidCards(
          currentPlayer.hand,
          gameState.currentTrick,
          gameState.heartsBroken,
          isFirstTrick(gameState)
        )
      : [];

  // Determine which trick to display (current or last completed)
  const displayTrick =
    showCompletedTrick && gameState?.lastCompletedTrick
      ? gameState.lastCompletedTrick
      : currentTrick;
  const isShowingCompletedTrick =
    showCompletedTrick &&
    gameState?.lastCompletedTrick &&
    currentTrick.length === 0;

  return (
    <div
      className={cn(
        "relative w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden",
        className
      )}
    >
      {/* Game Table - Scales with container */}
      <div className="absolute inset-0 p-4 md:p-6 lg:p-8">
        <motion.div
          className="relative w-full h-full bg-poker-green rounded-3xl shadow-2xl border-8 border-amber-900/80"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Felt texture overlay */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-700/30 via-transparent to-green-900/30" />
          <div className="absolute inset-0 rounded-3xl opacity-20 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

          {/* Inner border/rail effect */}
          <div className="absolute inset-4 rounded-2xl border-2 border-green-600/30" />

          {/*
            NOTE: The flying card animation was removed because it created a
            SEPARATE card instead of animating the actual clicked card.

            To properly animate the card from hand to center, you need to use
            Framer Motion's layoutId on both:
            1. The card in CardHand.tsx (when in hand)
            2. The card in the trick area (when played)

            Example: Add layoutId={`card-${card.suit}-${card.rank}`} to both
            motion.div wrappers, and Framer Motion will automatically animate
            the transition between positions.
          */}

          {/* Center area for current trick */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {/* Winner announcement - positioned absolutely above cards */}
            {isShowingCompletedTrick &&
              gameState?.lastTrickWinnerIndex !== undefined && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-[-120px] left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg z-20"
                >
                  🏆 {players[gameState.lastTrickWinnerIndex]?.name} wins!
                </motion.div>
              )}
            <div className="flex flex-col gap-2 items-center justify-center min-w-[280px] min-h-[200px]">
              <div className="relative w-[220px] h-[200px]">
                {displayTrick.map((trickCard) => {
                  const trickPlayerIndex = players.findIndex(
                    (p) => p.id === trickCard.playerId
                  );

                  // Check if this card is the winning card
                  const isWinning =
                    isShowingCompletedTrick &&
                    gameState?.lastTrickWinnerIndex === trickPlayerIndex;

                  // Position card based on which player played it
                  const cardPos = getTrickCardPosition(trickPlayerIndex);
                  const startPos = getPlayerStartPosition(trickPlayerIndex);

                  // If animating to winner, calculate final position
                  const winnerPos =
                    animatingToWinner &&
                    gameState?.lastTrickWinnerIndex !== undefined
                      ? getWinnerPosition(gameState.lastTrickWinnerIndex)
                      : null;

                  return (
                    <motion.div
                      key={`trick-${trickCard.playerId}-${trickCard.card.suit}-${trickCard.card.rank}`}
                      className={cn(
                        "absolute left-1/2 top-1/2",
                        isWinning &&
                          !animatingToWinner &&
                          "ring-4 ring-green-400 rounded-xl z-50"
                      )}
                      style={{
                        marginLeft: -48, // Half of card width
                        marginTop: -72, // Half of card height
                      }}
                      initial={{
                        x: startPos.x,
                        y: startPos.y,
                        scale: 0.5,
                        opacity: 0,
                        rotate: -90,
                      }}
                      animate={
                        animatingToWinner && winnerPos
                          ? {
                              x: winnerPos.x,
                              y: winnerPos.y,
                              scale: 0,
                              opacity: 0,
                              rotate: 0,
                            }
                          : isWinning
                          ? {
                              x: cardPos.x,
                              y: cardPos.y,
                              scale: 1.15,
                              opacity: 1,
                              rotate: 0,
                            }
                          : {
                              x: cardPos.x,
                              y: cardPos.y,
                              scale: 1,
                              opacity: 1,
                              rotate: 0,
                            }
                      }
                      transition={
                        animatingToWinner
                          ? {
                              type: "tween",
                              duration: 0.3,
                              ease: "easeInOut",
                            }
                          : {
                              type: "spring",
                              stiffness: 200,
                              damping: 25,
                            }
                      }
                    >
                      <Card
                        suit={trickCard.card.suit}
                        rank={trickCard.card.rank}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Player positions */}

          {/* Bottom Player (Current User) - Full fanned hand */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 pb-2 md:pb-4">
            {getPlayerAtPosition(0) && (
              <div className="flex flex-col items-center" ref={cardHandRef}>
                <CardHand
                  cards={getPlayerAtPosition(0)?.hand || []}
                  isFlipped={currentPlayerIndex !== 0}
                  onCardClick={
                    currentPlayerIndex === 0 ? onCardClick : undefined
                  }
                  validCards={
                    currentPlayerIndex === 0 &&
                    gameState?.currentPlayerIndex === 0
                      ? validCards
                      : undefined
                  }
                  selectedCard={selectedCard}
                />
                <div
                  className={cn(
                    "text-white font-semibold text-sm md:text-lg mt-1 md:mt-2 px-3 md:px-4 py-1 rounded-full transition-all",
                    gameState?.currentPlayerIndex === 0
                      ? "bg-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                      : gameState?.trickLeaderIndex === 0
                      ? "bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                      : "bg-black/30"
                  )}
                >
                  {getPlayerAtPosition(0)?.name}
                  {getPlayerAtPosition(0)?.isAI && " 🤖"}
                  {currentPlayerIndex === 0 && " (You)"}
                  {gameState?.currentPlayerIndex === 0 && " - Your Turn"}
                  {gameState?.trickLeaderIndex === 0 &&
                    gameState?.currentPlayerIndex !== 0 &&
                    " 👑"}
                </div>
                {gameState && (
                  <div className="text-white/80 text-xs mt-1">
                    Score: {gameState.scores[0]} | Round:{" "}
                    {gameState.roundScores[0]}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Player - Compact stacked cards */}
          <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2">
            {getPlayerAtPosition(2) && (
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div
                  className={cn(
                    "text-white font-semibold text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full transition-all",
                    gameState?.currentPlayerIndex === 2
                      ? "bg-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                      : gameState?.trickLeaderIndex === 2
                      ? "bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                      : "bg-black/30"
                  )}
                >
                  {getPlayerAtPosition(2)?.name}
                  {getPlayerAtPosition(2)?.isAI && " 🤖"}
                  {gameState?.trickLeaderIndex === 2 &&
                    gameState?.currentPlayerIndex !== 2 &&
                    " 👑"}
                </div>
                {gameState && (
                  <div className="text-white/70 text-xs mt-0.5">
                    Score: {gameState.scores[2]} | Round:{" "}
                    {gameState.roundScores[2]}
                  </div>
                )}
                <div className="flex -space-x-8 md:-space-x-12">
                  {getPlayerAtPosition(2)?.hand.map((card, idx) => (
                    <motion.div
                      key={`top-${idx}`}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{ zIndex: idx }}
                    >
                      <Card
                        suit={card.suit}
                        rank={card.rank}
                        isFlipped={true}
                        className="w-12 h-16 md:w-14 md:h-20"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Left Player (Player 1 - clockwise from bottom) - Vertical stacked cards */}
          <div className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2">
            {getPlayerAtPosition(1) && (
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div
                  className={cn(
                    "text-white font-semibold text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap transition-all",
                    gameState?.currentPlayerIndex === 1
                      ? "bg-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                      : gameState?.trickLeaderIndex === 1
                      ? "bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                      : "bg-black/30"
                  )}
                >
                  {getPlayerAtPosition(1)?.name}
                  {getPlayerAtPosition(1)?.isAI && " 🤖"}
                  {gameState?.trickLeaderIndex === 1 &&
                    gameState?.currentPlayerIndex !== 1 &&
                    " 👑"}
                </div>
                {gameState && (
                  <div className="text-white/70 text-xs mt-0.5">
                    Score: {gameState.scores[1]} | Round:{" "}
                    {gameState.roundScores[1]}
                  </div>
                )}
                <div className="flex flex-col -space-y-10 md:-space-y-14">
                  {getPlayerAtPosition(1)?.hand.map((card, idx) => (
                    <motion.div
                      key={`left-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{ zIndex: idx }}
                    >
                      <Card
                        suit={card.suit}
                        rank={card.rank}
                        isFlipped={true}
                        className="w-12 h-16 md:w-14 md:h-20"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Player (Player 3 - clockwise continues) - Vertical stacked cards */}
          <div className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2">
            {getPlayerAtPosition(3) && (
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div
                  className={cn(
                    "text-white font-semibold text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap transition-all",
                    gameState?.currentPlayerIndex === 3
                      ? "bg-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                      : gameState?.trickLeaderIndex === 3
                      ? "bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                      : "bg-black/30"
                  )}
                >
                  {getPlayerAtPosition(3)?.name}
                  {getPlayerAtPosition(3)?.isAI && " 🤖"}
                  {gameState?.trickLeaderIndex === 3 &&
                    gameState?.currentPlayerIndex !== 3 &&
                    " 👑"}
                </div>
                {gameState && (
                  <div className="text-white/70 text-xs mt-0.5">
                    Score: {gameState.scores[3]} | Round:{" "}
                    {gameState.roundScores[3]}
                  </div>
                )}
                <div className="flex flex-col -space-y-10 md:-space-y-14">
                  {getPlayerAtPosition(3)?.hand.map((card, idx) => (
                    <motion.div
                      key={`right-${idx}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{ zIndex: idx }}
                    >
                      <Card
                        suit={card.suit}
                        rank={card.rank}
                        isFlipped={true}
                        className="w-12 h-16 md:w-14 md:h-20"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
