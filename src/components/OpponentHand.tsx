import { motion } from "framer-motion";
import { Card } from "./Card";
import { DifficultyBadge } from "./DifficultyBadge";
import { cn } from "../lib/utils";
import type { Player, GameState } from "../types/game";

type Position = "top" | "left" | "right";

interface OpponentHandProps {
  player: Player;
  playerIndex: number;
  gameState: GameState | null;
  position: Position;
}

const POSITION_CONFIGS = {
  top: {
    containerClass: "absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2",
    stackClass: "flex -space-x-8 md:-space-x-12",
    cardAnimation: { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 } },
  },
  left: {
    containerClass: "absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2",
    stackClass: "flex flex-col -space-y-10 md:-space-y-14",
    cardAnimation: { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 } },
  },
  right: {
    containerClass: "absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2",
    stackClass: "flex flex-col -space-y-10 md:-space-y-14",
    cardAnimation: { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 } },
  },
};

export function OpponentHand({
  player,
  playerIndex,
  gameState,
  position,
}: OpponentHandProps) {
  const config = POSITION_CONFIGS[position];

  const isCurrentTurn = gameState?.currentPlayerIndex === playerIndex;
  const isTrickLeader = gameState?.trickLeaderIndex === playerIndex;
  const showLeaderCrown = isTrickLeader && !isCurrentTurn;

  return (
    <div className={config.containerClass}>
      <div className="flex flex-col items-center gap-1 md:gap-2">
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "text-white font-semibold text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full whitespace-nowrap transition-all",
              isCurrentTurn
                ? "bg-yellow-500/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                : isTrickLeader
                ? "bg-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                : "bg-black/30"
            )}
          >
            {player.name}
            {player.isAI && " 🤖"}
            {showLeaderCrown && " 👑"}
          </div>
          {player.isAI && (
            <DifficultyBadge difficulty={player.difficulty} size="sm" />
          )}
        </div>
        {gameState && (
          <div className="text-white/70 text-xs mt-0.5">
            Score: {gameState.scores[playerIndex]} | Round:{" "}
            {gameState.roundScores[playerIndex]}
          </div>
        )}
        <div className={config.stackClass}>
          {player.hand.map((card, idx) => (
            <motion.div
              key={`${position}-${idx}`}
              initial={config.cardAnimation.initial}
              animate={config.cardAnimation.animate}
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
    </div>
  );
}
