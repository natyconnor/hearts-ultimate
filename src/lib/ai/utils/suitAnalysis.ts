/**
 * Suit Analysis Utilities
 *
 * Functions for analyzing suit distribution in hands,
 * detecting voids, and evaluating suit protection.
 */

import type { Card, CardSuit } from "../../../types/game";
import type { SuitDistribution } from "../types";

const ALL_SUITS: CardSuit[] = ["clubs", "diamonds", "spades", "hearts"];

/**
 * Count the number of cards in each suit
 */
export function getSuitDistribution(hand: Card[]): SuitDistribution {
  const distribution: SuitDistribution = {
    clubs: 0,
    diamonds: 0,
    spades: 0,
    hearts: 0,
  };

  for (const card of hand) {
    distribution[card.suit]++;
  }

  return distribution;
}

/**
 * Get all cards of a specific suit from a hand
 */
export function getCardsOfSuit(hand: Card[], suit: CardSuit): Card[] {
  return hand.filter((c) => c.suit === suit);
}

/**
 * Check if high cards in a suit are "protected" by having enough low cards
 * A high card is protected if there are 3+ cards below it in the same suit
 */
export function hasProtectedHighCards(hand: Card[], suit: CardSuit): boolean {
  const cardsOfSuit = getCardsOfSuit(hand, suit).sort(
    (a, b) => a.rank - b.rank
  );

  if (cardsOfSuit.length < 4) {
    return false; // Not enough cards to have protection
  }

  // Check if we have high cards (J, Q, K, A = 11, 12, 13, 14)
  const highCards = cardsOfSuit.filter((c) => c.rank >= 11);
  if (highCards.length === 0) {
    return true; // No high cards to protect
  }

  // Count low cards (below the lowest high card)
  const lowestHighRank = Math.min(...highCards.map((c) => c.rank));
  const lowCards = cardsOfSuit.filter((c) => c.rank < lowestHighRank);

  // Need at least 3 low cards to protect high cards
  return lowCards.length >= 3;
}

/**
 * Get cards that would be good to pass to void a suit
 * Prioritizes suits with fewer cards
 */
export function getVoidingPassCandidates(hand: Card[]): Card[] {
  const distribution = getSuitDistribution(hand);
  const candidates: Card[] = [];

  // Find suits with 1-3 cards (can void by passing all)
  const shortSuits = ALL_SUITS.filter(
    (suit) => distribution[suit] >= 1 && distribution[suit] <= 3
  );

  // Sort by count (prefer voiding suits with fewer cards)
  shortSuits.sort((a, b) => distribution[a] - distribution[b]);

  for (const suit of shortSuits) {
    const cardsOfSuit = getCardsOfSuit(hand, suit);
    candidates.push(...cardsOfSuit);
  }

  return candidates;
}
