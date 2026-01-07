import { motion } from "framer-motion";
import { Card } from "./Card";
import type { Card as CardType } from "../types/game";
import { cn } from "../lib/utils";
import {
  calculateCardHandLayout,
  calculateCardPosition,
  cardsEqual,
} from "../game/cardDisplay";

interface CardHandProps {
  cards: CardType[];
  isFlipped?: boolean;
  onCardClick?: (card: CardType, index: number) => void;
  validCards?: CardType[];
  selectedCard?: CardType | null;
  className?: string;
}

export function CardHand({
  cards,
  isFlipped = false,
  onCardClick,
  validCards,
  selectedCard,
  className,
}: CardHandProps) {
  if (cards.length === 0) {
    return null;
  }

  const cardCount = cards.length;
  const layoutConfig = calculateCardHandLayout(cardCount);

  return (
    <div
      className={cn("relative flex items-end justify-center", className)}
      style={{
        height: "clamp(180px, 15vh, 220px)",
        width: `${Math.max(500, layoutConfig.totalWidth + 100)}px`,
        maxWidth: "95vw",
      }}
    >
      {cards.map((card, index) => {
        const position = calculateCardPosition(index, cardCount, layoutConfig);

        const isValid = validCards
          ? validCards.some((c) => cardsEqual(c, card))
          : true;
        const canClick = onCardClick && isValid && !isFlipped;

        return (
          <motion.div
            key={`${card.suit}-${card.rank}`}
            layout
            className={cn(
              "absolute transition-all duration-100 ease-out",
              canClick &&
                !(selectedCard && cardsEqual(selectedCard, card)) &&
                "hover:scale-110 hover:-translate-y-8 hover:z-[100] cursor-pointer",
              !isValid && onCardClick && "opacity-50 cursor-not-allowed"
            )}
            style={{
              left: `calc(50% + ${position.xOffset}px)`,
              bottom: `${position.yOffset}px`,
              transform: `translateX(-50%) rotate(${position.rotation}deg)`,
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
              rotate: position.rotation,
            }}
            transition={{
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30,
              },
              opacity: {
                duration: 0.2,
              },
              y: {
                type: "spring",
                stiffness: 300,
                damping: 25,
              },
              rotate: {
                type: "spring",
                stiffness: 300,
                damping: 25,
              },
            }}
          >
            <motion.div
              animate={
                selectedCard && cardsEqual(selectedCard, card)
                  ? {
                      scale: 1.1,
                      y: -16,
                    }
                  : {}
              }
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
              style={{
                zIndex: index, // Maintain natural layering order
              }}
            >
              <Card
                suit={card.suit}
                rank={card.rank}
                isFlipped={isFlipped}
                isSelected={
                  selectedCard ? cardsEqual(selectedCard, card) : false
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
