import type { CardSuit, CardRank } from "../types/game";
import { cn } from "../lib/utils";

interface CardProps {
  suit: CardSuit;
  rank: CardRank;
  isFlipped?: boolean;
  isSelected?: boolean;
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

export function Card({ suit, rank, isFlipped = false, isSelected = false, className, onClick }: CardProps) {
  const rankStr = rankToString(rank);
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  return (
    <div
      className={cn(
        "relative bg-white rounded-xl shadow-lg select-none",
        "flex flex-col items-center justify-center",
        "w-24 h-36 md:w-28 md:h-40",
        "transition-all duration-200",
        onClick && "cursor-pointer",
        isSelected && "ring-4 ring-yellow-400 ring-offset-2 ring-offset-poker-green scale-110 -translate-y-4 z-[200] shadow-2xl animate-pulse",
        className
      )}
      onClick={onClick}
    >
      {isFlipped ? (
        // Card back design
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-1.5">
          <div className="w-full h-full rounded-lg border border-white/20 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.05)_4px,rgba(255,255,255,0.05)_8px)] flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-amber-500/80 flex items-center justify-center">
              <span className="text-white font-bold text-xs">♠</span>
            </div>
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
    </div>
  );
}

