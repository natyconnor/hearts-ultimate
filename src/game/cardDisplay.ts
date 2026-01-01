import type { Card, CardRank } from "../types/game";

/**
 * Suit symbols for display
 */
const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

/**
 * Converts a card rank to its display string
 */
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

/**
 * Formats a single card as a string (e.g., "2♣", "K♥", "A♠")
 */
export function formatCard(card: Card): string {
  const rank = rankToString(card.rank);
  const suit = SUIT_SYMBOLS[card.suit] || card.suit[0].toUpperCase();
  return `${rank}${suit}`;
}

/**
 * Formats a hand of cards as a comma-separated string
 */
export function formatHand(hand: Card[]): string {
  return hand.map(formatCard).join(", ");
}

/**
 * Formats a hand with suit grouping for better readability
 * Groups cards by suit and displays them separated by suit
 */
export function formatHandGrouped(hand: Card[]): string {
  const grouped: Record<string, Card[]> = {
    clubs: [],
    diamonds: [],
    spades: [],
    hearts: [],
  };

  for (const card of hand) {
    grouped[card.suit].push(card);
  }

  const parts: string[] = [];
  for (const suit of ["clubs", "diamonds", "spades", "hearts"] as const) {
    if (grouped[suit].length > 0) {
      const suitSymbol = SUIT_SYMBOLS[suit];
      const cards = grouped[suit].map((c) => rankToString(c.rank)).join(", ");
      parts.push(`${suitSymbol} ${cards}`);
    }
  }

  return parts.join(" | ");
}

