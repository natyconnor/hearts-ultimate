import { motion } from "framer-motion";
import { Card } from "./Card";
import type { Card as CardType } from "../types/game";
import { cn } from "../lib/utils";

interface CardHandProps {
  cards: CardType[];
  isFlipped?: boolean;
  onCardClick?: (card: CardType, index: number) => void;
  className?: string;
}

export function CardHand({
  cards,
  isFlipped = false,
  onCardClick,
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

        return (
          <motion.div
            key={`${card.suit}-${card.rank}-${index}`}
            className={cn(
              "absolute transition-all duration-100 ease-out",
              onCardClick &&
                "hover:scale-110 hover:-translate-y-8 hover:z-[100]"
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
            <Card
              suit={card.suit}
              rank={card.rank}
              isFlipped={isFlipped}
              onClick={onCardClick ? () => onCardClick(card, index) : undefined}
              className="shadow-xl"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
