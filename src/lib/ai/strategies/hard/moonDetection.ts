/**
 * Moon Shooter Detection for Hard AI
 *
 * Detects if someone might be attempting to shoot the moon using:
 * 1. Score-based detection (traditional - someone has all points)
 * 2. Behavioral detection (sophisticated - suspicious play patterns)
 * 3. Current trick analysis (real-time detection)
 *
 * Behavioral signals include:
 * - Leading with Q♠ voluntarily (huge red flag!)
 * - Leading lots of high cards (trying to win tricks)
 * - Winning tricks with hearts willingly
 * - Winning ALL tricks so far (very suspicious!)
 * - Not dumping penalty cards when void
 */

import type { GameState, Card } from "../../../../types/game";
import type { AIConfig } from "../../types";
import { THRESHOLDS, RANK } from "../../types";
import { isQueenOfSpades, isHeart } from "../../../../game/rules";
import type { CardMemory } from "../../memory/cardMemory";

/** Threshold for behavioral suspicion to trigger detection */
const BEHAVIOR_SUSPICION_THRESHOLD = 25;

/** Early game threshold - detect based on behavior before points accumulate */
const EARLY_BEHAVIOR_THRESHOLD = 15;

/**
 * Detect if someone might be shooting the moon
 * Returns the player index of the suspected shooter, or null
 *
 * Uses score-based, behavioral, and real-time detection
 */
export function detectMoonShooter(
  gameState: GameState,
  config: AIConfig,
  memory?: CardMemory,
  currentTrick?: Array<{ playerId: string; card: Card }>
): number | null {
  const { roundScores, pointsCardsTaken, players } = gameState;

  // === SCORE-BASED DETECTION (traditional) ===
  // Check round scores - if someone has a lot of points and no one else has any
  for (let i = 0; i < roundScores.length; i++) {
    if (roundScores[i] >= config.moonDetectionThreshold) {
      // Check if they have all the points so far
      const otherScores = roundScores.filter((_, idx) => idx !== i);
      if (otherScores.every((s) => s === 0)) {
        return i; // Definite moon shooter
      }
    }
  }

  // Also check penalty cards taken
  if (pointsCardsTaken) {
    for (let i = 0; i < pointsCardsTaken.length; i++) {
      const hearts = pointsCardsTaken[i].filter((c) => isHeart(c)).length;
      const hasQueen = pointsCardsTaken[i].some(isQueenOfSpades);

      // If someone has 6+ hearts and Q♠ or 10+ hearts, they might be shooting
      if (
        (hearts >= THRESHOLDS.MOON_HEARTS_WITH_QUEEN && hasQueen) ||
        hearts >= THRESHOLDS.MOON_HEARTS_WITHOUT_QUEEN
      ) {
        const otherHearts = pointsCardsTaken
          .filter((_, idx) => idx !== i)
          .reduce(
            (sum, cards) => sum + cards.filter((c) => isHeart(c)).length,
            0
          );

        if (otherHearts === 0) {
          return i;
        }
      }
    }
  }

  // === CURRENT TRICK ANALYSIS (real-time) ===
  // Check if the current trick leader is showing VERY suspicious moon behavior
  // Only trigger on truly alarming plays, not just any high card lead
  if (currentTrick && currentTrick.length > 0) {
    const leadPlay = currentTrick[0];
    const leaderIndex = players.findIndex((p) => p.id === leadPlay.playerId);

    if (leaderIndex !== -1) {
      // Check if others have points - if so, no one can be shooting
      const otherScores = roundScores.filter((_, idx) => idx !== leaderIndex);
      const othersHavePoints = otherScores.some((s) => s > 0);

      if (!othersHavePoints) {
        // Leading with Q♠ is a HUGE red flag - instant detection!
        // No one voluntarily leads Q♠ unless shooting
        if (isQueenOfSpades(leadPlay.card)) {
          return leaderIndex;
        }

        // Leading with high hearts (Q+) when hearts broken is very suspicious
        // Combined with having taken some points already = likely shooting
        const playerScore = roundScores[leaderIndex];
        if (
          isHeart(leadPlay.card) &&
          leadPlay.card.rank >= RANK.QUEEN &&
          playerScore >= 3
        ) {
          return leaderIndex;
        }
      }
    }
  }

  // === DOMINATING PLAYER DETECTION ===
  // If one player has ALL penalty points so far, they might be shooting
  // BUT: Getting Q♠ dumped on you is common and doesn't mean shooting!
  // Need to check the COMPOSITION of points, not just total
  const totalPoints = roundScores.reduce((a, b) => a + b, 0);

  if (totalPoints > 0 && pointsCardsTaken) {
    for (let i = 0; i < 4; i++) {
      // This player has ALL the points
      if (roundScores[i] === totalPoints && roundScores[i] > 0) {
        const hearts = pointsCardsTaken[i].filter((c) => isHeart(c)).length;
        const hasQueen = pointsCardsTaken[i].some(isQueenOfSpades);

        // 10+ hearts = definitely collecting them intentionally
        if (hearts >= 10) {
          return i;
        }

        // Q♠ + 5+ hearts = suspicious combo (not just Q♠ dumped on them)
        if (hasQueen && hearts >= 5) {
          return i;
        }

        // 8+ hearts without Q♠ = actively collecting
        if (!hasQueen && hearts >= 8) {
          return i;
        }
      }
    }
  }

  // === BEHAVIORAL DETECTION (sophisticated) ===
  // Detect moon attempts based on play patterns
  // Be careful not to trigger too early - some high card leads are normal!
  if (memory) {
    const suspects = memory.getSuspiciousMoonPlayers();

    for (const suspect of suspects) {
      // Find the player index for this suspect
      const playerIndex = players.findIndex((p) => p.id === suspect.playerId);
      if (playerIndex === -1) continue;

      // Get their current score
      const playerScore = roundScores[playerIndex];
      const otherScores = roundScores.filter((_, idx) => idx !== playerIndex);
      const othersHavePoints = otherScores.some((s) => s > 0);

      // If others have points, this player can't be shooting
      if (othersHavePoints) continue;

      // Led Q♠ voluntarily is basically a confession - instant detection
      if (suspect.signals.ledQueenOfSpades) {
        return playerIndex;
      }

      // Very high suspicion score (multiple strong signals) = definitely shooting
      // Requires: 5+ high card leads, OR 2+ voluntary wins, OR combo
      if (suspect.suspicionScore >= BEHAVIOR_SUSPICION_THRESHOLD) {
        return playerIndex;
      }

      // === MODERATE DETECTION ===
      // Need BOTH significant points (8+) AND behavioral signals
      // This catches players who are collecting points AND acting suspicious
      if (
        playerScore >= 8 &&
        suspect.suspicionScore >= EARLY_BEHAVIOR_THRESHOLD
      ) {
        return playerIndex;
      }
    }
  }

  return null;
}

/**
 * Get detailed moon suspicion info for debugging
 */
export function getMoonSuspicionDetails(
  gameState: GameState,
  memory?: CardMemory
): Array<{
  playerName: string;
  playerIndex: number;
  score: number;
  behaviorScore: number;
  signals: string[];
}> {
  const results: Array<{
    playerName: string;
    playerIndex: number;
    score: number;
    behaviorScore: number;
    signals: string[];
  }> = [];

  const { players, roundScores } = gameState;

  if (!memory) return results;

  const suspects = memory.getSuspiciousMoonPlayers();

  for (const suspect of suspects) {
    const playerIndex = players.findIndex((p) => p.id === suspect.playerId);
    if (playerIndex === -1) continue;

    const signals: string[] = [];
    if (suspect.signals.ledQueenOfSpades) {
      signals.push("LED Q♠ (huge red flag!)");
    }
    if (suspect.signals.highCardLeads > 0) {
      signals.push(`${suspect.signals.highCardLeads} high card leads`);
    }
    if (suspect.signals.heartsWon > 0) {
      signals.push(`Won ${suspect.signals.heartsWon} hearts`);
    }
    if (suspect.signals.voluntaryWins > 0) {
      signals.push(`${suspect.signals.voluntaryWins} voluntary penalty wins`);
    }

    results.push({
      playerName: players[playerIndex].name,
      playerIndex,
      score: roundScores[playerIndex],
      behaviorScore: suspect.suspicionScore,
      signals,
    });
  }

  return results;
}
