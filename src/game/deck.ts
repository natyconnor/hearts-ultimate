import type { Card, CardSuit, CardRank } from "../types/game";

const SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: CardRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * Generates a full 52-card deck
 */
export function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Shuffles a deck of cards using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals 13 cards to each of 4 players from a deck
 * Returns an array of 4 hands (each hand is an array of 13 cards)
 */
export function dealCards(deck: Card[]): Card[][] {
  if (deck.length !== 52) {
    throw new Error("Deck must have exactly 52 cards");
  }

  const hands: Card[][] = [[], [], [], []];

  for (let i = 0; i < 52; i++) {
    const playerIndex = i % 4;
    hands[playerIndex].push(deck[i]);
  }

  return hands;
}

/**
 * Creates a shuffled deck and deals it to 4 players
 * Convenience function that combines generateDeck, shuffleDeck, and dealCards
 */
export function createAndDeal(): Card[][] {
  const deck = generateDeck();
  const shuffled = shuffleDeck(deck);
  return dealCards(shuffled);
}
