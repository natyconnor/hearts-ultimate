import { motion } from "framer-motion";
import { Card } from "./Card";
import { cn } from "../lib/utils";
import {
  getTrickCardPosition,
  getPlayerStartPosition,
  getWinnerPosition,
} from "../game/cardDisplay";
import type { Card as CardType, Player, GameState } from "../types/game";

interface TrickAreaProps {
  displayTrick: Array<{ playerId: string; card: CardType }>;
  players: Player[];
  gameState: GameState | null;
  currentPlayerIndex: number;
  isShowingCompletedTrick: boolean;
  animatingToWinner: boolean;
}

export function TrickArea({
  displayTrick,
  players,
  gameState,
  currentPlayerIndex,
  isShowingCompletedTrick,
  animatingToWinner,
}: TrickAreaProps) {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      {/* Winner announcement - positioned absolutely above cards */}
      {isShowingCompletedTrick &&
        gameState?.lastTrickWinnerIndex !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-[-120px] left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg z-20 whitespace-nowrap"
          >
            🏆{" "}
            {gameState.lastTrickWinnerIndex === currentPlayerIndex
              ? "You win!"
              : `${players[gameState.lastTrickWinnerIndex]?.name} wins!`}
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
                <Card suit={trickCard.card.suit} rank={trickCard.card.rank} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
