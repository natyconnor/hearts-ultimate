/**
 * Trick Analysis Utilities
 *
 * Functions for analyzing the current trick state, predicting winners,
 * and calculating penalty points.
 */

import type { Card, CardSuit } from "../../../types/game";
import { isHeart, isQueenOfSpades } from "../../../game/rules";

/**
 * Calculate the penalty points in a trick
 */
export function getPenaltyPointsInTrick(
  trick: Array<{ playerId: string; card: Card }>
): number {
  let points = 0;
  for (const play of trick) {
    if (isHeart(play.card)) {
      points += 1;
    } else if (isQueenOfSpades(play.card)) {
      points += 13;
    }
  }
  return points;
}

/**
 * Get the highest rank of lead suit played so far in the trick
 */
export function getHighestRankInTrick(
  trick: Array<{ playerId: string; card: Card }>,
  leadSuit: CardSuit
): number {
  let highest = 0;
  for (const play of trick) {
    if (play.card.suit === leadSuit && play.card.rank > highest) {
      highest = play.card.rank;
    }
  }
  return highest;
}

/**
 * Check if we're the last player to play in the trick
 */
export function isLastToPlay(trickLength: number): boolean {
  return trickLength === 3; // 0, 1, 2 already played, we're #3
}

/**
 * Check if Q♠ is in the current trick
 */
export function isQueenOfSpadesInTrick(
  currentTrickCards: Array<{ playerId: string; card: Card }>
): boolean {
  return currentTrickCards.some(
    (play) => play.card.suit === "spades" && play.card.rank === 12
  );
}
