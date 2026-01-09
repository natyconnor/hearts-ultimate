/**
 * Moon Shooter Detection
 *
 * Detects if someone might be shooting the moon using:
 * - Score-based: someone has all penalty points
 * - Behavioral: suspicious play patterns (Q♠ lead, high card leads, voluntary wins)
 * - Real-time: alarming plays in current trick
 */

import type { GameState, Card } from "../../../../types/game";
import type { AIConfig } from "../../types";
import { THRESHOLDS, RANK } from "../../constants";
import { isQueenOfSpades, isHeart } from "../../../../game/rules";
import type { CardMemory } from "../../memory/cardMemory";

const BEHAVIOR_SUSPICION_THRESHOLD = 25;
const EARLY_BEHAVIOR_THRESHOLD = 15;

/** Detect if someone might be shooting the moon. Returns player index or null. */
export function detectMoonShooter(
  gameState: GameState,
  config: AIConfig,
  memory?: CardMemory,
  currentTrick?: Array<{ playerId: string; card: Card }>
): number | null {
  const { roundScores, pointsCardsTaken, players } = gameState;

  // Score-based: someone has lots of points and no one else has any
  for (let i = 0; i < roundScores.length; i++) {
    if (roundScores[i] >= config.moonDetectionThreshold) {
      const otherScores = roundScores.filter((_, idx) => idx !== i);
      if (otherScores.every((s) => s === 0)) {
        return i;
      }
    }
  }

  // Check penalty cards composition
  if (pointsCardsTaken) {
    for (let i = 0; i < pointsCardsTaken.length; i++) {
      const hearts = pointsCardsTaken[i].filter((c) => isHeart(c)).length;
      const hasQueen = pointsCardsTaken[i].some(isQueenOfSpades);

      // 6+ hearts with Q♠, or 10+ hearts alone
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

  // Current trick analysis - detect alarming plays
  if (currentTrick && currentTrick.length > 0) {
    const leadPlay = currentTrick[0];
    const leaderIndex = players.findIndex((p) => p.id === leadPlay.playerId);

    if (leaderIndex !== -1) {
      const otherScores = roundScores.filter((_, idx) => idx !== leaderIndex);
      const othersHavePoints = otherScores.some((s) => s > 0);

      if (!othersHavePoints) {
        // Leading with Q♠ is a huge red flag
        if (isQueenOfSpades(leadPlay.card)) {
          return leaderIndex;
        }

        // Leading high hearts with points already taken
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

  // Dominating player: has ALL penalty points
  const totalPoints = roundScores.reduce((a, b) => a + b, 0);

  if (totalPoints > 0 && pointsCardsTaken) {
    for (let i = 0; i < 4; i++) {
      if (roundScores[i] === totalPoints && roundScores[i] > 0) {
        const hearts = pointsCardsTaken[i].filter((c) => isHeart(c)).length;
        const hasQueen = pointsCardsTaken[i].some(isQueenOfSpades);

        if (hearts >= 10) return i;
        if (hasQueen && hearts >= 5) return i;
        if (!hasQueen && hearts >= 8) return i;
      }
    }
  }

  // Behavioral detection via memory
  if (memory) {
    const suspects = memory.getSuspiciousMoonPlayers();

    for (const suspect of suspects) {
      const playerIndex = players.findIndex((p) => p.id === suspect.playerId);
      if (playerIndex === -1) continue;

      const playerScore = roundScores[playerIndex];
      const otherScores = roundScores.filter((_, idx) => idx !== playerIndex);
      const othersHavePoints = otherScores.some((s) => s > 0);

      if (othersHavePoints) continue;

      // Led Q♠ = instant detection
      if (suspect.signals.ledQueenOfSpades) {
        return playerIndex;
      }

      // High suspicion score
      if (suspect.suspicionScore >= BEHAVIOR_SUSPICION_THRESHOLD) {
        return playerIndex;
      }

      // Moderate: 8+ points AND behavioral signals
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

/** Get detailed moon suspicion info for debugging */
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
  if (!memory) return [];

  const { players, roundScores } = gameState;
  const suspects = memory.getSuspiciousMoonPlayers();

  return suspects
    .map((suspect) => {
      const playerIndex = players.findIndex((p) => p.id === suspect.playerId);
      if (playerIndex === -1) return null;

      const signals: string[] = [];
      if (suspect.signals.ledQueenOfSpades)
        signals.push("LED Q♠ (huge red flag!)");
      if (suspect.signals.highCardLeads > 0)
        signals.push(`${suspect.signals.highCardLeads} high card leads`);
      if (suspect.signals.heartsWon > 0)
        signals.push(`Won ${suspect.signals.heartsWon} hearts`);
      if (suspect.signals.voluntaryWins > 0)
        signals.push(`${suspect.signals.voluntaryWins} voluntary penalty wins`);

      return {
        playerName: players[playerIndex].name,
        playerIndex,
        score: roundScores[playerIndex],
        behaviorScore: suspect.suspicionScore,
        signals,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}
