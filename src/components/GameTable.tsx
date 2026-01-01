import { motion } from "framer-motion";
import { CardHand } from "./CardHand";
import { Card } from "./Card";
import type { Card as CardType, Player } from "../types/game";
import { cn } from "../lib/utils";

interface GameTableProps {
  players: Player[];
  currentPlayerId: string | null;
  currentTrick: Array<{ playerId: string; card: CardType }>;
  onCardClick?: (card: CardType, index: number) => void;
  className?: string;
}

export function GameTable({
  players,
  currentPlayerId,
  currentTrick,
  onCardClick,
  className,
}: GameTableProps) {
  // Get player at each position
  const getPlayerAtPosition = (index: number): Player | null => {
    return players[index] || null;
  };

  // Get current player's index
  const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);

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

          {/* Center area for current trick */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex gap-3 items-center justify-center min-w-[200px] min-h-[120px]">
              {currentTrick.length === 0 ? (
                <div className="text-white/20 text-sm font-medium">
                  Current Trick
                </div>
              ) : (
                currentTrick.map((trickCard, index) => (
                  <motion.div
                    key={`trick-${trickCard.playerId}-${index}`}
                    initial={{ scale: 0, rotate: -180, y: 50 }}
                    animate={{ scale: 1, rotate: 0, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Card
                      suit={trickCard.card.suit}
                      rank={trickCard.card.rank}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Player positions */}

          {/* Bottom Player (Current User) - Full fanned hand */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 pb-2 md:pb-4">
            {getPlayerAtPosition(0) && (
              <div className="flex flex-col items-center">
                <CardHand
                  cards={getPlayerAtPosition(0)?.hand || []}
                  isFlipped={currentPlayerIndex !== 0}
                  onCardClick={
                    currentPlayerIndex === 0 ? onCardClick : undefined
                  }
                />
                <div className="text-white font-semibold text-sm md:text-lg mt-1 md:mt-2 bg-black/30 px-3 md:px-4 py-1 rounded-full">
                  {getPlayerAtPosition(0)?.name}
                  {getPlayerAtPosition(0)?.isAI && " (AI)"}
                  {currentPlayerIndex === 0 && " (You)"}
                </div>
              </div>
            )}
          </div>

          {/* Top Player - Compact stacked cards */}
          <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2">
            {getPlayerAtPosition(2) && (
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className="text-white font-semibold text-xs md:text-sm bg-black/30 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  {getPlayerAtPosition(2)?.name}
                  {getPlayerAtPosition(2)?.isAI && " (AI)"}
                </div>
                <div className="flex -space-x-8 md:-space-x-12">
                  {getPlayerAtPosition(2)
                    ?.hand.slice(0, 5)
                    .map((card, idx) => (
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
                {getPlayerAtPosition(2) &&
                  getPlayerAtPosition(2)!.hand.length > 0 && (
                    <div className="text-white/70 text-xs">
                      {getPlayerAtPosition(2)!.hand.length} cards
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Left Player - Vertical stacked cards */}
          <div className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2">
            {getPlayerAtPosition(3) && (
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className="text-white font-semibold text-xs md:text-sm bg-black/30 px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap">
                  {getPlayerAtPosition(3)?.name}
                  {getPlayerAtPosition(3)?.isAI && " (AI)"}
                </div>
                <div className="flex flex-col -space-y-10 md:-space-y-14">
                  {getPlayerAtPosition(3)
                    ?.hand.slice(0, 4)
                    .map((card, idx) => (
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
                {getPlayerAtPosition(3) &&
                  getPlayerAtPosition(3)!.hand.length > 0 && (
                    <div className="text-white/70 text-xs mt-1 md:mt-2">
                      {getPlayerAtPosition(3)!.hand.length} cards
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Right Player - Vertical stacked cards */}
          <div className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2">
            {getPlayerAtPosition(1) && (
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div className="text-white font-semibold text-xs md:text-sm bg-black/30 px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap">
                  {getPlayerAtPosition(1)?.name}
                  {getPlayerAtPosition(1)?.isAI && " (AI)"}
                </div>
                <div className="flex flex-col -space-y-10 md:-space-y-14">
                  {getPlayerAtPosition(1)
                    ?.hand.slice(0, 4)
                    .map((card, idx) => (
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
                {getPlayerAtPosition(1) &&
                  getPlayerAtPosition(1)!.hand.length > 0 && (
                    <div className="text-white/70 text-xs mt-1 md:mt-2">
                      {getPlayerAtPosition(1)!.hand.length} cards
                    </div>
                  )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
