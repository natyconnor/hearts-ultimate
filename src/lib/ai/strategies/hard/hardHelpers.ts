/**
 * Hard AI Helper Functions
 */

import type { Card, GameState } from "../../../../types/game";
import type { AIConfig, PlayContext } from "../../types";
import { THRESHOLDS } from "../../constants";
import { getPenaltyPointsInTrick } from "../../utils/trickAnalysis";

/** Determine if we should consider bluffing */
export function shouldBluff(context: PlayContext, config: AIConfig): boolean {
  if (Math.random() > config.bluffProbability) return false;
  if (context.isFirstTrick) return false;
  if (context.tricksPlayedThisRound >= THRESHOLDS.LATE_GAME_TRICKS)
    return false;
  if (getPenaltyPointsInTrick(context.currentTrickCards) > 0) return false;
  return true;
}

/** Find the player in the lead (lowest score). Returns null if scores are close. */
export function findLeader(
  gameState: GameState,
  config: AIConfig
): number | null {
  const { scores } = gameState;
  const minScore = Math.min(...scores);
  const leaderIndex = scores.indexOf(minScore);

  const sortedScores = [...scores].sort((a, b) => a - b);
  if (sortedScores.length >= 2) {
    const leadAmount = sortedScores[1] - sortedScores[0];
    if (leadAmount >= config.leaderPointThreshold) {
      return leaderIndex;
    }
  }

  return null;
}

/** Get the index of the player currently winning the trick */
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
