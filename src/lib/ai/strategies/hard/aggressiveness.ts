/**
 * Aggressiveness System for Hard AI
 *
 * Provides dynamic aggressiveness that varies per-game and adapts based on
 * score position. Losing players become more aggressive, winning players
 * become more conservative.
 *
 * Scale: 0.0 (very conservative) to 1.0 (very aggressive)
 */

import type { GameState } from "../../../../types/game";
import type { AggressivenessModifiers } from "../../types";
import { AGGRESSIVENESS } from "../../constants";

/**
 * Generates a random base aggressiveness for game start.
 * Range: 0.3 to 0.7 for personality variety while staying reasonable.
 */
export function generateBaseAggressiveness(): number {
  const range = AGGRESSIVENESS.BASE_MAX - AGGRESSIVENESS.BASE_MIN;
  return AGGRESSIVENESS.BASE_MIN + Math.random() * range;
}

/**
 * Calculates score-based adjustment to aggressiveness.
 *
 * - Behind average: positive adjustment (more aggressive)
 * - Ahead of average: negative adjustment (more conservative)
 *
 * @returns Adjustment in range [-0.3, +0.3]
 */
export function calculateScoreAdjustment(
  gameState: GameState,
  playerIndex: number
): number {
  const scores = gameState.scores;
  if (scores.length < 4) return 0;

  const myScore = scores[playerIndex];
  const opponentScores = scores.filter((_, i) => i !== playerIndex);
  const avgOpponentScore =
    opponentScores.reduce((a, b) => a + b, 0) / opponentScores.length;

  // In Hearts, HIGHER score = LOSING (bad)
  // Positive delta = we're behind (should be more aggressive)
  // Negative delta = we're ahead (should be more conservative)
  const scoreDelta = myScore - avgOpponentScore;

  // Scale and clamp the adjustment
  const rawAdjustment = scoreDelta / AGGRESSIVENESS.SCORE_DIVISOR;
  return Math.max(
    -AGGRESSIVENESS.MAX_ADJUSTMENT,
    Math.min(AGGRESSIVENESS.MAX_ADJUSTMENT, rawAdjustment)
  );
}

/**
 * Gets the effective aggressiveness combining base and score adjustment.
 * Result is clamped to [0.0, 1.0].
 */
export function getEffectiveAggressiveness(
  baseAggressiveness: number,
  gameState: GameState,
  playerIndex: number
): number {
  const adjustment = calculateScoreAdjustment(gameState, playerIndex);
  const effective = baseAggressiveness + adjustment;
  return Math.max(0, Math.min(1, effective));
}

/**
 * Computes all scoring modifiers based on current aggressiveness level.
 * These modifiers are applied to the base scoring constants.
 */
export function getAggressivenessModifiers(
  aggressiveness: number
): AggressivenessModifiers {
  return {
    // Moon threshold: lower = more likely to attempt
    // At 0.0 aggression: +15 (threshold 90), at 1.0: -15 (threshold 60)
    moonThresholdAdjustment:
      -((aggressiveness - 0.5) * AGGRESSIVENESS.MOON_THRESHOLD_RANGE),

    // Duck preference: higher = more likely to duck
    // At 0.0 aggression: 1.4x, at 1.0: 0.6x
    duckPreferenceMultiplier:
      AGGRESSIVENESS.DUCK_MULTIPLIER_BASE -
      aggressiveness * AGGRESSIVENESS.DUCK_MULTIPLIER_FACTOR,

    // Risk tolerance: higher = more penalty for risky plays
    // At 0.0 aggression: 1.4x penalty, at 1.0: 0.6x penalty
    riskToleranceMultiplier:
      AGGRESSIVENESS.RISK_MULTIPLIER_BASE -
      aggressiveness * AGGRESSIVENESS.RISK_MULTIPLIER_FACTOR,

    // High card dump bonus: higher aggression = more eager to dump
    // At 0.0: 0 bonus, at 1.0: +25 bonus
    highCardDumpBonus: aggressiveness * AGGRESSIVENESS.HIGH_CARD_DUMP_MAX_BONUS,

    // Bluff probability: higher aggression = more bluffing
    // At 0.0: 8%, at 1.0: 30%
    bluffProbability:
      AGGRESSIVENESS.BLUFF_BASE +
      aggressiveness * AGGRESSIVENESS.BLUFF_RANGE,

    // Leader targeting: lower threshold = target leaders earlier
    // At 0.0: 25 point lead, at 1.0: 10 point lead
    leaderTargetThreshold:
      AGGRESSIVENESS.LEADER_THRESHOLD_BASE -
      aggressiveness * AGGRESSIVENESS.LEADER_THRESHOLD_RANGE,

    // Leader targeting factor: how much to hold cards for dumping on leader
    // At 0.0 aggression: 0 (dump on anyone), at 1.0: 0.7 (strongly prefer leader)
    leaderTargetingFactor: aggressiveness * AGGRESSIVENESS.LEADER_TARGETING_MAX,
  };
}

/**
 * Gets a human-readable description of the aggressiveness level.
 */
export function getAggressivenessLabel(aggressiveness: number): string {
  if (aggressiveness < 0.3) return "Very Conservative";
  if (aggressiveness < 0.45) return "Conservative";
  if (aggressiveness < 0.55) return "Balanced";
  if (aggressiveness < 0.7) return "Aggressive";
  return "Very Aggressive";
}
