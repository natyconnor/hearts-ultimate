import type { Card } from "../types/game";

/**
 * Calculates card hand layout properties for fanning cards
 */
export interface CardLayoutConfig {
  maxRotation: number;
  cardSpacing: number;
  totalWidth: number;
}

export interface CardPosition {
  rotation: number;
  xOffset: number;
  yOffset: number;
}

/**
 * Calculates layout configuration for a hand of cards
 */
export function calculateCardHandLayout(
  cardCount: number,
  options?: {
    maxRotationMultiplier?: number;
    maxRotationCap?: number;
    spacingDivisor?: number;
    maxSpacing?: number;
  }
): CardLayoutConfig {
  const {
    maxRotationMultiplier = 2,
    maxRotationCap = 25,
    spacingDivisor = 700,
    maxSpacing = 60,
  } = options || {};

  const maxRotation = Math.min(
    maxRotationCap,
    cardCount * maxRotationMultiplier
  );
  const cardSpacing = Math.min(maxSpacing, spacingDivisor / cardCount);
  const totalWidth = cardCount * cardSpacing;

  return { maxRotation, cardSpacing, totalWidth };
}

/**
 * Calculates the position for a single card in a fanned hand
 */
export function calculateCardPosition(
  index: number,
  cardCount: number,
  config: CardLayoutConfig,
  options?: {
    yOffsetMultiplier?: number;
  }
): CardPosition {
  const { yOffsetMultiplier = 4 } = options || {};
  const centerIndex = (cardCount - 1) / 2;
  const offsetFromCenter = index - centerIndex;

  const rotation =
    centerIndex > 0 ? (offsetFromCenter / centerIndex) * config.maxRotation : 0;
  const xOffset = offsetFromCenter * config.cardSpacing;
  const yOffset = Math.abs(offsetFromCenter) * yOffsetMultiplier;

  return { rotation, xOffset, yOffset };
}

/**
 * Checks if two cards are equal
 */
export function cardsEqual(card1: Card, card2: Card): boolean {
  return card1.suit === card2.suit && card1.rank === card2.rank;
}

/**
 * Card position in trick circle (clockwise: 0=bottom, 1=left, 2=top, 3=right)
 */
export interface TrickCardPosition {
  x: number;
  y: number;
}

/**
 * Gets the position for a card in the trick circle based on player index
 */
export function getTrickCardPosition(playerIndex: number): TrickCardPosition {
  const radius = 80;
  const positions: Record<number, TrickCardPosition> = {
    0: { x: 0, y: radius }, // Bottom player's card at bottom of circle
    1: { x: -radius, y: 0 }, // Left player's card at left of circle
    2: { x: 0, y: -radius }, // Top player's card at top of circle
    3: { x: radius, y: 0 }, // Right player's card at right of circle
  };
  return positions[playerIndex];
}

/**
 * Gets the starting position for card animation (from player's position)
 */
export function getPlayerStartPosition(playerIndex: number): TrickCardPosition {
  const positions: Record<number, TrickCardPosition> = {
    0: { x: 0, y: 250 }, // Bottom - card flies from below
    1: { x: -250, y: 0 }, // Left - card flies from left
    2: { x: 0, y: -250 }, // Top - card flies from above
    3: { x: 250, y: 0 }, // Right - card flies from right
  };
  return positions[playerIndex];
}

/**
 * Gets the winner's position for animation (where cards should move to)
 */
export function getWinnerPosition(playerIndex: number): {
  x: number | string;
  y: number | string;
} {
  const positions: Record<number, { x: number | string; y: number | string }> =
    {
      0: { x: 0, y: "45vh" }, // Bottom - all the way to bottom player's hand
      1: { x: "-45vw", y: 0 }, // Left - all the way to left player's hand
      2: { x: 0, y: "-45vh" }, // Top - all the way to top player's hand
      3: { x: "45vw", y: 0 }, // Right - all the way to right player's hand
    };
  return positions[playerIndex];
}
