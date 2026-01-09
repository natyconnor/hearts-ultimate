/**
 * Helper Functions for Hard AI
 *
 * Utility functions used across Hard AI scoring modules.
 */

import type { Card, GameState } from "../../../../types/game";
import type { AIConfig, PlayContext } from "../../types";
import { THRESHOLDS } from "../../types";
import { getPenaltyPointsInTrick } from "../../utils/trickAnalysis";

/**
 * Determine if we should consider bluffing
 */
export function shouldBluff(context: PlayContext, config: AIConfig): boolean {
  // Random chance based on config
  if (Math.random() > config.bluffProbability) {
    return false;
  }

  // Don't bluff on first trick
  if (context.isFirstTrick) return false;

  // Don't bluff late in round
  if (context.tricksPlayedThisRound >= THRESHOLDS.LATE_GAME_TRICKS)
    return false;

  // Don't bluff if there are penalties in the trick
  if (getPenaltyPointsInTrick(context.currentTrickCards) > 0) return false;

  return true;
}

/**
 * Find the player who is currently in the lead (lowest score)
 * Returns null if scores are close
 */
export function findLeader(
  gameState: GameState,
  config: AIConfig
): number | null {
  const { scores } = gameState;
  const minScore = Math.min(...scores);
  const leaderIndex = scores.indexOf(minScore);

  // Check if there's a significant lead
  const sortedScores = [...scores].sort((a, b) => a - b);
  if (sortedScores.length >= 2) {
    const leadAmount = sortedScores[1] - sortedScores[0];
    if (leadAmount >= config.leaderPointThreshold) {
      return leaderIndex;
    }
  }

  return null;
}

/**
 * Get the index of the player currently winning the trick
 */
export function getCurrentTrickWinner(
  trick: Array<{ playerId: string; card: Card }>,
  gameState: GameState
): number | null {
  if (trick.length === 0) return null;

  const leadSuit = trick[0].card.suit;
  let winningPlay = trick[0];

  for (const play of trick) {
    if (play.card.suit === leadSuit && play.card.rank > winningPlay.card.rank) {
      winningPlay = play;
    }
  }

  return gameState.players.findIndex((p) => p.id === winningPlay.playerId);
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
