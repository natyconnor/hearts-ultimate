import { motion } from "framer-motion";
import { CardHand } from "./CardHand";
import type { Card as CardType, Player, GameState } from "../types/game";
import { cn } from "../lib/utils";
import { getValidCards, isFirstTrick } from "../game/rules";
import { DifficultyBadge } from "./DifficultyBadge";
import { TrickArea } from "./TrickArea";
import { GameIndicators } from "./GameIndicators";
import { OpponentHand } from "./OpponentHand";

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
          <TrickArea
            displayTrick={displayTrick}
            players={players}
            gameState={gameState}
            currentPlayerIndex={currentPlayerIndex}
            isShowingCompletedTrick={isShowingCompletedTrick ?? false}
            animatingToWinner={animatingToWinner ?? false}
          />

          {/* Player positions */}

          {/* Bottom Player (Current User) - Full fanned hand */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 pb-2 md:pb-4">
            {getPlayerAtPosition(0) && (
              <div className="flex flex-col items-center" ref={cardHandRef}>
                {/* Badges above player's hand */}
                <GameIndicators
                  gameState={gameState}
                  playerHand={getPlayerAtPosition(0)?.hand || []}
                />
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
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "text-white font-semibold text-sm md:text-lg px-3 md:px-4 py-1 rounded-full transition-all",
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
                  {getPlayerAtPosition(0)?.isAI && (
                    <DifficultyBadge
                      difficulty={getPlayerAtPosition(0)?.difficulty}
                      size="md"
                    />
                  )}
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
          {getPlayerAtPosition(2) && (
            <OpponentHand
              player={getPlayerAtPosition(2)!}
              playerIndex={2}
              gameState={gameState}
              position="top"
            />
          )}

          {/* Left Player (Player 1 - clockwise from bottom) - Vertical stacked cards */}
          {getPlayerAtPosition(1) && (
            <OpponentHand
              player={getPlayerAtPosition(1)!}
              playerIndex={1}
              gameState={gameState}
              position="left"
            />
          )}

          {/* Right Player (Player 3 - clockwise continues) - Vertical stacked cards */}
          {getPlayerAtPosition(3) && (
            <OpponentHand
              player={getPlayerAtPosition(3)!}
              playerIndex={3}
              gameState={gameState}
              position="right"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
