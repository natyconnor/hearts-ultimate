import { motion } from "framer-motion";
import { Card } from "./Card";
import { cn } from "../lib/utils";
import {
  getTrickCardPosition,
  getPlayerStartPosition,
  getWinnerPosition,
  gameIndexToVisualPosition,
} from "../game/cardDisplay";
import type { CardIdentity, Player, GameState } from "../types/game";

interface TrickAreaProps {
  displayTrick: Array<{ playerId: string; card: CardIdentity }>;
  players: Player[];
  gameState: GameState | null;
  myGameIndex: number;
  isShowingCompletedTrick: boolean;
  animatingToWinner: boolean;
}

export function TrickArea({
  displayTrick,
  players,
  gameState,
  myGameIndex,
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
            {gameState.lastTrickWinnerIndex === myGameIndex
              ? "You win!"
              : `${players[gameState.lastTrickWinnerIndex]?.name} wins!`}
          </motion.div>
        )}
      <div className="flex flex-col gap-2 items-center justify-center min-w-[280px] min-h-[200px]">
        <div className="relative w-[220px] h-[200px]">
          {displayTrick.map((trickCard) => {
            // Find the game index of the player who played this card
            const trickPlayerGameIndex = players.findIndex(
              (p) => p.id === trickCard.playerId
            );

            // Convert to visual position (where the card should appear on screen)
            const visualPosition =
              myGameIndex >= 0
                ? gameIndexToVisualPosition(trickPlayerGameIndex, myGameIndex)
                : trickPlayerGameIndex;

            // Check if this card is the winning card
            const isWinning =
              isShowingCompletedTrick &&
              gameState?.lastTrickWinnerIndex === trickPlayerGameIndex;

            // Position card based on visual position (rotated for current player's perspective)
            const cardPos = getTrickCardPosition(visualPosition);
            const startPos = getPlayerStartPosition(visualPosition);

            // If animating to winner, calculate final position (use visual position of winner)
            const winnerVisualPosition =
              animatingToWinner &&
              gameState?.lastTrickWinnerIndex !== undefined &&
              myGameIndex >= 0
                ? gameIndexToVisualPosition(
                    gameState.lastTrickWinnerIndex,
                    myGameIndex
                  )
                : gameState?.lastTrickWinnerIndex;
            const winnerPos =
              animatingToWinner && winnerVisualPosition !== undefined
                ? getWinnerPosition(winnerVisualPosition)
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
                  showQueenGlow={
                    trickCard.card.suit === "spades" &&
                    trickCard.card.rank === 12
                  }
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
