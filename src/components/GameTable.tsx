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

// Player positions: 0=Bottom (User), 1=Right, 2=Top, 3=Left
const PLAYER_POSITIONS = [
  { position: "bottom", label: "You" },
  { position: "right", label: "Right" },
  { position: "top", label: "Top" },
  { position: "left", label: "Left" },
] as const;

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
    <div className={cn("relative w-full h-screen bg-gradient-to-b from-gray-100 to-gray-200", className)}>
      {/* Game Table - Oval felt surface */}
      <div className="absolute inset-4 md:inset-8 lg:inset-16 xl:inset-24">
        <motion.div
          className="relative w-full h-full bg-poker-green rounded-[50%] shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subtle felt texture */}
          <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-poker-green/80 via-green-900/90 to-poker-green/80" />
          <div className="absolute inset-0 rounded-[50%] opacity-10 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

          {/* Center area for current trick */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 flex items-center justify-center">
            <div className="flex gap-2 items-center justify-center">
              {currentTrick.length === 0 ? (
                <div className="text-white/30 text-sm">Current Trick</div>
              ) : (
                currentTrick.map((trickCard, index) => (
                  <motion.div
                    key={`trick-${index}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card suit={trickCard.card.suit} rank={trickCard.card.rank} />
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Player positions */}
          {/* Bottom Player (User) */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
            {getPlayerAtPosition(0) && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-white font-semibold text-lg">
                  {getPlayerAtPosition(0)?.name}
                  {getPlayerAtPosition(0)?.isAI && " (AI)"}
                </div>
                <CardHand
                  cards={getPlayerAtPosition(0)?.hand || []}
                  isFlipped={currentPlayerIndex !== 0}
                  onCardClick={currentPlayerIndex === 0 ? onCardClick : undefined}
                />
              </div>
            )}
          </div>

          {/* Top Player */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
            {getPlayerAtPosition(2) && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-white font-semibold text-lg">
                  {getPlayerAtPosition(2)?.name}
                  {getPlayerAtPosition(2)?.isAI && " (AI)"}
                </div>
                <div className="transform rotate-180">
                  <CardHand
                    cards={getPlayerAtPosition(2)?.hand || []}
                    isFlipped={currentPlayerIndex !== 2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Left Player */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {getPlayerAtPosition(3) && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-white font-semibold text-sm text-center whitespace-nowrap">
                  {getPlayerAtPosition(3)?.name}
                  {getPlayerAtPosition(3)?.isAI && " (AI)"}
                </div>
                <div className="flex flex-col gap-1">
                  {getPlayerAtPosition(3)?.hand.slice(0, 3).map((card, idx) => (
                    <motion.div
                      key={`left-${idx}`}
                      style={{ marginLeft: idx * 2 }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card
                        suit={card.suit}
                        rank={card.rank}
                        isFlipped={currentPlayerIndex !== 3}
                        className="w-12 h-16 text-xs"
                      />
                    </motion.div>
                  ))}
                  {getPlayerAtPosition(3) && getPlayerAtPosition(3)!.hand.length > 3 && (
                    <div className="text-white text-xs text-center mt-1">
                      +{getPlayerAtPosition(3)!.hand.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Player */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {getPlayerAtPosition(1) && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-white font-semibold text-sm text-center whitespace-nowrap">
                  {getPlayerAtPosition(1)?.name}
                  {getPlayerAtPosition(1)?.isAI && " (AI)"}
                </div>
                <div className="flex flex-col gap-1">
                  {getPlayerAtPosition(1)?.hand.slice(0, 3).map((card, idx) => (
                    <motion.div
                      key={`right-${idx}`}
                      style={{ marginLeft: idx * 2 }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card
                        suit={card.suit}
                        rank={card.rank}
                        isFlipped={currentPlayerIndex !== 1}
                        className="w-12 h-16 text-xs"
                      />
                    </motion.div>
                  ))}
                  {getPlayerAtPosition(1) && getPlayerAtPosition(1)!.hand.length > 3 && (
                    <div className="text-white text-xs text-center mt-1">
                      +{getPlayerAtPosition(1)!.hand.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

