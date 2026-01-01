import type { Card, CardSuit, CardRank } from "../types/game";

const SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: CardRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * Suit order for sorting: clubs, diamonds, spades, hearts
 */
const SUIT_ORDER: Record<CardSuit, number> = {
  clubs: 0,
  diamonds: 1,
  spades: 2,
  hearts: 3,
};

/**
 * Sorts a hand of cards by suit (clubs, diamonds, spades, hearts) then by rank (ascending)
 */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    // First sort by suit
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) {
      return suitDiff;
    }
    // Then sort by rank (ascending)
    return a.rank - b.rank;
  });
}

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
 * Returns an array of 4 hands (each hand is an array of 13 cards, sorted)
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

  // Sort each hand by suit (clubs, diamonds, spades, hearts) then by rank
  return hands.map((hand) => sortHand(hand));
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
