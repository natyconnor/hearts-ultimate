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

export function CardHand({ cards, isFlipped = false, onCardClick, className }: CardHandProps) {
  if (cards.length === 0) {
    return null;
  }

  // Calculate rotation and offset for fanning effect
  const maxRotation = 15;
  const rotationStep = (maxRotation * 2) / (cards.length - 1 || 1);
  const offsetStep = 30; // Horizontal offset between cards

  return (
    <div className={cn("flex items-end justify-center relative h-40", className)}>
      {cards.map((card, index) => {
        const rotation = (index - (cards.length - 1) / 2) * rotationStep;
        const offset = (index - (cards.length - 1) / 2) * offsetStep;
        const zIndex = index;

        return (
          <motion.div
            key={`${card.suit}-${card.rank}-${index}`}
            className="absolute"
            style={{
              transform: `translateX(${offset}px) rotate(${rotation}deg)`,
              zIndex,
            }}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{
              y: -20,
              rotate: rotation,
              zIndex: 1000,
            }}
          >
            <Card
              suit={card.suit}
              rank={card.rank}
              isFlipped={isFlipped}
              onClick={onCardClick ? () => onCardClick(card, index) : undefined}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

