import type { CardSuit, CardRank } from "../types/game";
import { cn } from "../lib/utils";

interface CardProps {
  suit: CardSuit;
  rank: CardRank;
  isFlipped?: boolean;
  isSelected?: boolean;
  className?: string;
  onClick?: () => void;
  isMini?: boolean; // Mini card variant - simpler design for summaries
  showQueenGlow?: boolean; // Show ominous glow for Queen of Spades
}

const SUIT_SYMBOLS: Record<CardSuit, string> = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

const SUIT_COLORS: Record<CardSuit, string> = {
  clubs: "text-slate-900",
  diamonds: "text-red-600",
  spades: "text-slate-900",
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

export function Card({
  suit,
  rank,
  isFlipped = false,
  isSelected = false,
  className,
  onClick,
  isMini = false,
  showQueenGlow = false,
}: CardProps) {
  const rankStr = rankToString(rank);
  const suitSymbol = SUIT_SYMBOLS[suit];
  const suitColor = SUIT_COLORS[suit];

  // Queen of Spades detection
  const isQueenOfSpades = suit === "spades" && rank === 12;
  const shouldShowQueenGlow = isQueenOfSpades && showQueenGlow;

  return (
    <div
      className={cn(
        "relative rounded-xl shadow-lg select-none",
        !isMini && "w-24 h-36 md:w-28 md:h-40",
        "transition-all duration-200 ease-out",
        "transform-gpu",
        onClick && "cursor-pointer hover:shadow-2xl active:scale-95",
        isSelected &&
          "ring-4 ring-yellow-400 ring-offset-2 ring-offset-poker-green scale-110 -translate-y-4 z-[200] shadow-2xl",
        shouldShowQueenGlow &&
          "shadow-2xl shadow-red-500/50 ring-3 ring-red-400",
        className
      )}
      onClick={onClick}
    >
      {isFlipped ? (
        // Card back design
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 p-1.5 shadow-inner">
          <div className="w-full h-full rounded-lg border border-blue-400/30 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.03)_4px,rgba(255,255,255,0.03)_8px)] flex items-center justify-center relative overflow-hidden">
            {/* Diamond pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
                backgroundSize: "20px 20px",
              }}
            />
            {/* Center emblem */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-2 border-amber-300/50">
              <span className="text-white font-black text-sm drop-shadow-md">
                ♠
              </span>
            </div>
          </div>
        </div>
      ) : isMini ? (
        // Mini card variant - simplified design
        <div className="w-full h-full bg-gradient-to-br from-white via-white to-gray-50 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
          {/* Card border */}
          <div className="absolute inset-0 rounded-lg border border-gray-200/80 pointer-events-none" />

          {/* Top-left corner - rank only */}
          <div
            className={cn(
              "absolute top-0.5 left-1 text-[0.9rem] font-bold leading-none",
              suitColor
            )}
          >
            {rankStr}
          </div>

          {/* Bottom-right corner (rotated) - rank only */}
          <div
            className={cn(
              "absolute bottom-0.5 right-1 text-[0.9rem] font-bold rotate-180 leading-none",
              suitColor
            )}
          >
            {rankStr}
          </div>

          {/* Center suit icon - smaller */}
          <div className={cn("text-2xl font-bold", suitColor)}>
            {suitSymbol}
          </div>
        </div>
      ) : (
        // Card front - full design
        <div className="w-full h-full bg-gradient-to-br from-white via-white to-gray-50 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle shine effect */}
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.8) 50%, transparent 55%)",
              transform: "translateX(-100%)",
              animation: onClick ? "shine 3s infinite" : "none",
            }}
          />

          {/* Card border/edge effect */}
          <div className="absolute inset-0 rounded-xl border border-gray-200/80 pointer-events-none" />

          {/* Top-left corner */}
          <div
            className={cn(
              "absolute top-1.5 left-2 text-[clamp(0.6rem,2vw,0.9rem)] font-bold leading-tight",
              suitColor
            )}
          >
            <div className="leading-none mb-1">{rankStr}</div>
            <div className="text-[clamp(0.5rem,1.5vw,0.8rem)] leading-none -mt-0.5">
              {suitSymbol}
            </div>
          </div>

          {/* Bottom-right corner (rotated) */}
          <div
            className={cn(
              "absolute bottom-1.5 right-2 text-[clamp(0.6rem,2vw,0.9rem)] font-bold rotate-180 leading-tight",
              suitColor
            )}
          >
            <div className="leading-none mb-1">{rankStr}</div>
            <div className="text-[clamp(0.5rem,1.5vw,0.8rem)] leading-none -mt-0.5">
              {suitSymbol}
            </div>
          </div>

          {/* Center suit icon with subtle shadow */}
          <div
            className={cn(
              "text-[clamp(1.75rem,6vw,2.75rem)] font-bold drop-shadow-sm",
              suitColor
            )}
          >
            {suitSymbol}
          </div>
        </div>
      )}

      {/* Selection glow effect */}
      {isSelected && (
        <div className="absolute -inset-1 bg-yellow-400/20 rounded-2xl blur-md -z-10 animate-pulse" />
      )}
    </div>
  );
}
