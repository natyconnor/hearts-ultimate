import { motion } from "framer-motion";
import { Card } from "./Card";
import type { Card as CardType } from "../types/game";
import { cn } from "../lib/utils";

interface CardHandProps {
  cards: CardType[];
  isFlipped?: boolean;
  onCardClick?: (card: CardType, index: number) => void;
  validCards?: CardType[];
  selectedCard?: CardType | null;
  confirmingCard?: CardType | null;
  className?: string;
}

export function CardHand({
  cards,
  isFlipped = false,
  onCardClick,
  validCards,
  selectedCard,
  confirmingCard,
  className,
}: CardHandProps) {
  if (cards.length === 0) {
    return null;
  }

  const cardCount = cards.length;

  // Adjust spread based on card count
  const maxRotation = Math.min(25, cardCount * 2);
  const cardSpacing = Math.min(60, 700 / cardCount);
  const totalWidth = cardCount * cardSpacing;

  return (
    <div
      className={cn("relative flex items-end justify-center", className)}
      style={{
        height: "clamp(180px, 15vh, 220px)",
        width: `${Math.max(500, totalWidth + 100)}px`,
        maxWidth: "95vw",
      }}
    >
      {cards.map((card, index) => {
        // Calculate position from center
        const centerIndex = (cardCount - 1) / 2;
        const offsetFromCenter = index - centerIndex;

        // Rotation: cards fan out from center
        const rotation =
          centerIndex > 0 ? (offsetFromCenter / centerIndex) * maxRotation : 0;

        // Horizontal offset from center
        const xOffset = offsetFromCenter * cardSpacing;

        // Vertical offset: cards at edges are slightly lower (arc effect)
        const yOffset = Math.abs(offsetFromCenter) * 4;

        const isValid = validCards
          ? validCards.some((c) => c.suit === card.suit && c.rank === card.rank)
          : true;
        const canClick = onCardClick && isValid && !isFlipped;

        return (
          <motion.div
            key={`${card.suit}-${card.rank}-${index}`}
            className={cn(
              "absolute transition-all duration-100 ease-out",
              canClick &&
                !(
                  selectedCard?.suit === card.suit &&
                  selectedCard?.rank === card.rank
                ) &&
                "hover:scale-110 hover:-translate-y-8 hover:z-[100] cursor-pointer",
              !isValid && onCardClick && "opacity-50 cursor-not-allowed"
            )}
            style={{
              left: `calc(50% + ${xOffset}px)`,
              bottom: `${yOffset}px`,
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              transformOrigin: "center bottom",
              zIndex: index,
            }}
            initial={{
              opacity: 0,
              y: 50,
              rotate: 0,
            }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: rotation,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: index * 0.03,
            }}
          >
            <motion.div
              animate={
                confirmingCard?.suit === card.suit &&
                confirmingCard?.rank === card.rank
                  ? {
                      scale: [1.1, 1.3],
                      rotate: [0, 180],
                    }
                  : selectedCard?.suit === card.suit &&
                    selectedCard?.rank === card.rank
                  ? {
                      scale: 1.1,
                      y: -16,
                    }
                  : {}
              }
              transition={{
                duration:
                  confirmingCard?.suit === card.suit &&
                  confirmingCard?.rank === card.rank
                    ? 0.4
                    : 0.2,
                ease: "easeInOut",
              }}
              style={{
                zIndex:
                  selectedCard?.suit === card.suit &&
                  selectedCard?.rank === card.rank
                    ? 200
                    : confirmingCard?.suit === card.suit &&
                      confirmingCard?.rank === card.rank
                    ? 300
                    : index,
              }}
            >
              <Card
                suit={card.suit}
                rank={card.rank}
                isFlipped={isFlipped}
                isSelected={
                  selectedCard?.suit === card.suit &&
                  selectedCard?.rank === card.rank
                }
                onClick={
                  canClick ? () => onCardClick?.(card, index) : undefined
                }
                className="shadow-xl"
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
