import type { Card, GameState } from "../types/game";
import { getValidCards, getLeadSuit, isFirstTrick } from "../game/rules";

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
