import { motion } from "framer-motion";
import type { Card as CardType, CardSuit, CardRank } from "../types/game";
import { cn } from "../lib/utils";

interface CardProps {
  suit: CardSuit;
  rank: CardRank;
  isFlipped?: boolean;
  className?: string;
  onClick?: () => void;
}

const SUIT_SYMBOLS: Record<CardSuit, string> = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

const SUIT_COLORS: Record<CardSuit, string> = {
  clubs: "text-black",
  diamonds: "text-red-600",
  spades: "text-black",
  hearts: "text-red-600",
};

function rankToString(rank: CardRank): string {
  switch (rank) {
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    case 14:
      return "A";
    default:
      return rank.toString();
  }
}

export function Card({ suit, rank, isFlipped = false, className, onClick }: CardProps) {
  const rankStr = rankToString(rank);
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  return (
    <motion.div
      className={cn(
        "relative w-20 h-28 bg-white rounded-2xl shadow-lg cursor-pointer select-none",
        "flex flex-col items-center justify-center",
        onClick && "hover:shadow-xl",
        className
      )}
      whileHover={onClick ? { scale: 1.05, y: -4 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
    >
      {isFlipped ? (
        // Card back design
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-poker-green via-green-800 to-poker-green p-2">
          <div className="w-full h-full rounded-xl border-2 border-white/20 bg-gradient-to-br from-green-700/50 to-poker-green/50 flex items-center justify-center">
            <div className="text-white/40 font-bold text-[clamp(1rem,4vw,1.5rem)]">♠</div>
          </div>
        </div>
      ) : (
        // Card front
        <>
          {/* Top-left corner */}
          <div className={cn("absolute top-1 left-1 text-[clamp(0.5rem,2vw,0.875rem)] font-bold", suitColor)}>
            <div className="leading-none">{rankStr}</div>
            <div className="text-[clamp(0.375rem,1.5vw,0.75rem)] leading-none">{suitSymbol}</div>
          </div>

          {/* Bottom-right corner (rotated) */}
          <div className={cn("absolute bottom-1 right-1 text-[clamp(0.5rem,2vw,0.875rem)] font-bold rotate-180", suitColor)}>
            <div className="leading-none">{rankStr}</div>
            <div className="text-[clamp(0.375rem,1.5vw,0.75rem)] leading-none">{suitSymbol}</div>
          </div>

          {/* Center suit icon */}
          <div className={cn("text-[clamp(1.5rem,6vw,2.5rem)] font-bold", suitColor)}>
            {suitSymbol}
          </div>
        </>
      )}
    </motion.div>
  );
}

