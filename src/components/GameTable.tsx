import { motion } from "framer-motion";
import { CardHand } from "./CardHand";
import type { Card as CardType, Player, GameState } from "../types/game";
import { cn } from "../lib/utils";
import { getValidCards, isFirstTrick } from "../game/rules";
import { visualPositionToGameIndex } from "../game/cardDisplay";
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
  /** Whether the viewer is a spectator (not a player) */
  isSpectating?: boolean;
  /** For spectators: which player index they're watching from (0-3) */
  watchingPlayerIndex?: number;
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
  isSpectating = false,
  watchingPlayerIndex = 0,
}: GameTableProps) {
  // Get current player's game index (the player viewing this screen)
  // For spectators, use the watching player index as their view perspective
  const playerGameIndex = players.findIndex((p) => p.id === currentPlayerId);
  const viewingIndex = isSpectating ? watchingPlayerIndex : playerGameIndex;

  // myGameIndex is used for determining who "you" are (affects turn indicators, etc.)
  // For spectators, they're watching a specific player
  const myGameIndex = viewingIndex;

  // Get player at each visual position (0=bottom/self, 1=left, 2=top, 3=right)
  // This rotates the view so the viewed player is always at the bottom
  const getPlayerAtVisualPosition = (visualPosition: number): Player | null => {
    if (myGameIndex < 0) {
      // Fallback if not found - use absolute positions
      return players[visualPosition] || null;
    }
    const gameIndex = visualPositionToGameIndex(visualPosition, myGameIndex);
    return players[gameIndex] || null;
  };

  // Get the game index for a visual position
  const getGameIndexForVisualPosition = (visualPosition: number): number => {
    if (myGameIndex < 0) return visualPosition;
    return visualPositionToGameIndex(visualPosition, myGameIndex);
  };

  // Get valid cards for current player (only for actual players, not spectators)
  const myPlayer =
    !isSpectating && playerGameIndex >= 0 ? players[playerGameIndex] : null;
  const validCards =
    gameState && myPlayer && playerGameIndex === gameState.currentPlayerIndex
      ? getValidCards(
          myPlayer.hand,
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
            myGameIndex={myGameIndex}
            isShowingCompletedTrick={isShowingCompletedTrick ?? false}
            animatingToWinner={animatingToWinner ?? false}
          />

          {/* Player positions */}

          {/* Bottom Player (Current User or Watched Player for spectators) - Full fanned hand */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 pb-2 md:pb-4">
            {getPlayerAtVisualPosition(0) && (
              <div className="flex flex-col items-center" ref={cardHandRef}>
                {/* Badges above player's hand */}
                <GameIndicators
                  gameState={gameState}
                  playerHand={getPlayerAtVisualPosition(0)?.hand || []}
                />
                <CardHand
                  cards={getPlayerAtVisualPosition(0)?.hand || []}
                  isFlipped={false}
                  onCardClick={
                    !isSpectating && playerGameIndex >= 0
                      ? onCardClick
                      : undefined
                  }
                  validCards={
                    !isSpectating &&
                    playerGameIndex >= 0 &&
                    gameState?.currentPlayerIndex === playerGameIndex
                      ? validCards
                      : undefined
                  }
                  selectedCard={isSpectating ? null : selectedCard}
                />
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "text-white font-semibold text-sm md:text-lg px-3 md:px-4 py-1 rounded-full transition-all",
                      gameState?.currentPlayerIndex === myGameIndex
                        ? "bg-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                        : gameState?.trickLeaderIndex === myGameIndex
                        ? "bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                        : "bg-black/30"
                    )}
                  >
                    {getPlayerAtVisualPosition(0)?.name}
                    {getPlayerAtVisualPosition(0)?.isAI && " 🤖"}
                    {!isSpectating && playerGameIndex >= 0 && " (You)"}
                    {isSpectating && " (Watching)"}
                    {gameState?.currentPlayerIndex === myGameIndex &&
                      (isSpectating ? " - Their Turn" : " - Your Turn")}
                    {gameState?.trickLeaderIndex === myGameIndex &&
                      gameState?.currentPlayerIndex !== myGameIndex &&
                      " 👑"}
                  </div>
                  {getPlayerAtVisualPosition(0)?.isAI && (
                    <DifficultyBadge
                      difficulty={getPlayerAtVisualPosition(0)?.difficulty}
                      size="md"
                    />
                  )}
                </div>
                {gameState && myGameIndex >= 0 && (
                  <div className="text-white/80 text-xs mt-1">
                    Score: {gameState.scores[myGameIndex]} | Round:{" "}
                    {gameState.roundScores[myGameIndex]}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Player - Compact stacked cards */}
          {getPlayerAtVisualPosition(2) && (
            <OpponentHand
              player={getPlayerAtVisualPosition(2)!}
              playerIndex={getGameIndexForVisualPosition(2)}
              gameState={gameState}
              position="top"
              showCards={isSpectating}
            />
          )}

          {/* Left Player (clockwise from bottom) - Vertical stacked cards */}
          {getPlayerAtVisualPosition(1) && (
            <OpponentHand
              player={getPlayerAtVisualPosition(1)!}
              playerIndex={getGameIndexForVisualPosition(1)}
              gameState={gameState}
              position="left"
              showCards={isSpectating}
            />
          )}

          {/* Right Player (clockwise continues) - Vertical stacked cards */}
          {getPlayerAtVisualPosition(3) && (
            <OpponentHand
              player={getPlayerAtVisualPosition(3)!}
              playerIndex={getGameIndexForVisualPosition(3)}
              gameState={gameState}
              position="right"
              showCards={isSpectating}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
