import type { Card, GameState } from "../types/game";
import {
  getValidCards,
  getLeadSuit,
  isFirstTrick,
  isQueenOfSpades,
  isHeart,
} from "../game/rules";

/**
 * AI logic for choosing cards to pass during the passing phase
 * Strategy: Pass high cards, especially penalty cards (Q♠, high hearts)
 * @param hand - The AI player's hand
 * @returns Array of 3 cards to pass
 */
export function chooseAICardsToPass(hand: Card[]): Card[] {
  if (hand.length < 3) {
    return hand.slice(0, 3); // Shouldn't happen, but safety
  }

  // Score each card based on how much we want to get rid of it
  // Higher score = want to pass it more
  const scoredCards = hand.map((card) => {
    let score = 0;

    // Queen of spades - definitely pass it (unless we have low spades to protect)
    if (isQueenOfSpades(card)) {
      score += 100;
    }

    // High hearts - we want to pass these
    if (isHeart(card)) {
      score += 20 + card.rank; // Hearts are bad, higher rank = worse
    }

    // High cards in general are risky (might win tricks we don't want)
    score += card.rank;

    // Ace and King of spades are dangerous if we don't have Q♠
    if (card.suit === "spades" && card.rank >= 13) {
      // If we have Q♠, keep high spades to possibly shoot the moon
      const hasQueenOfSpades = hand.some(isQueenOfSpades);
      if (!hasQueenOfSpades) {
        score += 15; // Pass high spades if we don't have queen
      }
    }

    return { card, score };
  });

  // Sort by score descending (highest score = want to pass most)
  scoredCards.sort((a, b) => b.score - a.score);

  // Return the top 3 cards
  return scoredCards.slice(0, 3).map((sc) => sc.card);
}

/**
 * Simple AI strategy: Easy difficulty
 * - If there's a lead suit, play the lowest card of that suit
 * - If leading (no lead suit), pick a random valid suit and play the lowest card of that suit
 */
export function chooseAICard(
  gameState: GameState,
  playerIndex: number
): Card | null {
  const player = gameState.players[playerIndex];
  if (!player || !player.isAI) {
    return null;
  }

  const hand = player.hand;
  if (hand.length === 0) {
    return null;
  }

  // Get valid cards the AI can play
  const validCards = getValidCards(
    hand,
    gameState.currentTrick,
    gameState.heartsBroken,
    isFirstTrick(gameState)
  );

  if (validCards.length === 0) {
    // Shouldn't happen, but fallback to first card
    return hand[0];
  }

  const leadSuit = getLeadSuit(gameState.currentTrick);

  // If there's a lead suit, play the lowest card of that suit
  if (leadSuit) {
    const cardsOfLeadSuit = validCards.filter((card) => card.suit === leadSuit);
    if (cardsOfLeadSuit.length > 0) {
      // Sort by rank ascending and return the lowest
      const sorted = [...cardsOfLeadSuit].sort((a, b) => a.rank - b.rank);
      return sorted[0];
    }
  }

  // No lead suit (AI is leading) - pick a random valid suit and play lowest card
  // Group valid cards by suit
  const cardsBySuit = new Map<string, Card[]>();
  validCards.forEach((card) => {
    const suitCards = cardsBySuit.get(card.suit) || [];
    suitCards.push(card);
    cardsBySuit.set(card.suit, suitCards);
  });

  // Pick a random suit from available suits
  const suits = Array.from(cardsBySuit.keys());
  if (suits.length === 0) {
    // Fallback: shouldn't happen, but return first valid card
    return validCards[0];
  }

  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  const cardsOfRandomSuit = cardsBySuit.get(randomSuit) || [];

  // Sort by rank ascending and return the lowest card of the chosen suit
  const sorted = [...cardsOfRandomSuit].sort((a, b) => a.rank - b.rank);
  return sorted[0];
}
