/**
 * Dump Card Scoring
 *
 * Normal: dump penalty cards (Q♠, hearts), high cards.
 * Moon shooting: keep penalty cards, dump low cards instead.
 */

import type { Card } from "../../../../types/game";
import type {
  PlayContext,
  ScoredCard,
  AIConfig,
  AggressivenessModifiers,
} from "../../types";
import { RANK, DUMP_SCORES, AGGRESSIVENESS } from "../../constants";
import {
  isQueenOfSpades,
  isHeart,
  isPenaltyCard,
} from "../../../../game/rules";
import { isQueenOfSpadesInTrick } from "../../utils/trickAnalysis";
import type { CardMemory } from "../../memory/cardMemory";
import { findLeader, getCurrentTrickWinner } from "./hardHelpers";

export function scoreDumpCards(
  validCards: Card[],
  context: PlayContext,
  memory: CardMemory,
  config: AIConfig,
  moonShooterIndex: number | null,
  attemptingMoon = false,
  modifiers?: AggressivenessModifiers
): ScoredCard[] {
  if (attemptingMoon) {
    return scoreMoonDump(validCards);
  }

  const { gameState, playerIndex, currentTrickCards } = context;
  const currentWinnerIndex = getCurrentTrickWinner(
    currentTrickCards,
    gameState
  );

  // Use aggressiveness-adjusted leader threshold if provided
  const effectiveConfig = modifiers
    ? { ...config, leaderPointThreshold: modifiers.leaderTargetThreshold }
    : config;
  const leaderIndex = findLeader(gameState, effectiveConfig);

  // Bonus for dumping high cards (aggressive AI dumps more readily)
  const highCardDumpBonus = modifiers?.highCardDumpBonus ?? 0;
  const trickNumber = context.tricksPlayedThisRound + 1;

  return validCards.map((card) => {
    let score = DUMP_SCORES.BASE;
    const reasons: string[] = [];

    if (isQueenOfSpades(card)) {
      scoreQueenDump(
        currentWinnerIndex,
        leaderIndex,
        moonShooterIndex,
        playerIndex,
        trickNumber,
        modifiers,
        reasons,
        (adj) => {
          score += adj;
        }
      );
    }

    if (isHeart(card)) {
      scoreHeartDump(
        card,
        currentWinnerIndex,
        leaderIndex,
        moonShooterIndex,
        playerIndex,
        trickNumber,
        modifiers,
        reasons,
        (adj) => {
          score += adj;
        }
      );
    }

    // Note: "Dump on leader" bonus is now handled inside scoreQueenDump/scoreHeartDump
    // for penalty cards, so we only add it here for non-penalty high cards if needed

    // High non-penalty cards
    if (card.rank >= RANK.HIGH_THRESHOLD && !isPenaltyCard(card)) {
      if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
        // Keep high cards for moon defense - prefer keeping HIGHER cards (A > K > Q)
        // Add small rank bonus so we dump J before Q before K before A
        score -= 40 - card.rank * 0.5;
        reasons.push("Keep high card (moon defense)");
      } else {
        // Add aggressiveness bonus - aggressive AI dumps high cards more readily
        score += card.rank * DUMP_SCORES.HIGH_CARD_RANK_MULTIPLIER + highCardDumpBonus;
        reasons.push("Dump high card");
      }
    }

    // Keep low spades for Q♠ defense
    if (card.suit === "spades" && card.rank < RANK.QUEEN) {
      const queenAccountedFor =
        isQueenOfSpadesInTrick(currentTrickCards) ||
        memory.isQueenOfSpadesPlayed();

      if (!queenAccountedFor) {
        // When Q♠ still out, prefer dumping HIGHER spades (keep lower ones for protection)
        // Add small rank bonus so 10♠ > 7♠ > 3♠ for dumping priority
        score += DUMP_SCORES.HARD_KEEP_SPADE_QUEEN_OUT + card.rank * 0.5;
        reasons.push("Keep spade - Q♠ still out");
      } else {
        // Q♠ is gone, still prefer keeping lower spades but less critical
        score += DUMP_SCORES.HARD_KEEP_LOW_SPADE + card.rank * 0.3;
        reasons.push("Keep low spade");
      }
    }

    return { card, score, reasons };
  });
}

function scoreMoonDump(validCards: Card[]): ScoredCard[] {
  return validCards.map((card) => {
    let score = DUMP_SCORES.BASE;
    const reasons: string[] = [];

    // Never dump penalty cards when shooting
    if (isPenaltyCard(card)) {
      score -= 200;
      reasons.push("Moon: KEEP penalty cards!");
    }

    // Prefer low cards
    if (card.rank <= 5) {
      score += 50 + (6 - card.rank) * 5;
      reasons.push("Moon: dump low card");
    } else if (card.rank <= 8) {
      score += 30;
      reasons.push("Moon: dump mid card");
    }

    // Keep high non-penalty cards for control
    if (card.rank >= RANK.HIGH_THRESHOLD && !isPenaltyCard(card)) {
      score -= 30;
      reasons.push("Moon: keep high cards for control");
    }

    return { card, score, reasons };
  });
}

function scoreQueenDump(
  currentWinnerIndex: number | null,
  leaderIndex: number | null,
  moonShooterIndex: number | null,
  playerIndex: number,
  trickNumber: number,
  modifiers: AggressivenessModifiers | undefined,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  // Moon defense takes priority
  if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
    if (currentWinnerIndex === moonShooterIndex) {
      addScore(DUMP_SCORES.DONT_GIVE_QUEEN_TO_SHOOTER);
      reasons.push("Don't give Q♠ to moon shooter");
    } else {
      addScore(DUMP_SCORES.DUMP_ON_NON_SHOOTER);
      reasons.push("Dump Q♠ on non-shooter");
    }
    return;
  }

  const baseBonus = DUMP_SCORES.QUEEN_OF_SPADES; // 200
  const winnerIsLeader =
    leaderIndex !== null && currentWinnerIndex === leaderIndex;

  if (winnerIsLeader) {
    // Dump on leader! Full bonus + targeting bonus
    addScore(baseBonus + DUMP_SCORES.DUMP_ON_LEADER);
    reasons.push("Dump Q♠ on leader!");
  } else if (!modifiers || modifiers.leaderTargetingFactor < 0.1) {
    // Conservative: just dump it
    addScore(baseBonus);
    reasons.push("Dump Q♠!");
  } else {
    // Aggressive: consider holding for leader
    let holdFactor = modifiers.leaderTargetingFactor;

    // Late round: reduce holding behavior (desperation)
    if (trickNumber >= AGGRESSIVENESS.LATE_ROUND_TRICK_THRESHOLD) {
      holdFactor *= AGGRESSIVENESS.LATE_ROUND_HOLD_REDUCTION;
    }

    // Reduce bonus based on hold factor
    // At factor 0.7: bonus becomes 200 * 0.3 = 60
    const adjustedBonus = baseBonus * (1 - holdFactor);
    addScore(adjustedBonus);

    if (holdFactor > 0.3) {
      reasons.push("Hold Q♠ for leader");
    } else {
      reasons.push("Dump Q♠!");
    }
  }
}

function scoreHeartDump(
  card: Card,
  currentWinnerIndex: number | null,
  leaderIndex: number | null,
  moonShooterIndex: number | null,
  playerIndex: number,
  trickNumber: number,
  modifiers: AggressivenessModifiers | undefined,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  const baseBonus =
    DUMP_SCORES.HEART_BASE + card.rank * DUMP_SCORES.HEART_RANK_MULTIPLIER;

  // Moon defense takes priority
  if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
    if (currentWinnerIndex === moonShooterIndex) {
      addScore(DUMP_SCORES.DONT_GIVE_HEARTS_TO_SHOOTER);
      reasons.push("Don't give hearts to shooter");
    } else {
      addScore(baseBonus);
      reasons.push("Dump heart on non-shooter");
    }
    return;
  }

  const winnerIsLeader =
    leaderIndex !== null && currentWinnerIndex === leaderIndex;

  if (winnerIsLeader) {
    // Dump on leader! Full bonus + targeting bonus
    addScore(baseBonus + DUMP_SCORES.DUMP_ON_LEADER);
    reasons.push("Dump heart on leader!");
  } else if (!modifiers || modifiers.leaderTargetingFactor < 0.1) {
    // Conservative: just dump it
    addScore(baseBonus);
    reasons.push("Dump heart");
  } else {
    // Aggressive: consider holding for leader (hearts use half the factor - less critical)
    let holdFactor = modifiers.leaderTargetingFactor * 0.5;

    // Late round: reduce holding behavior (desperation)
    if (trickNumber >= AGGRESSIVENESS.LATE_ROUND_TRICK_THRESHOLD) {
      holdFactor *= AGGRESSIVENESS.LATE_ROUND_HOLD_REDUCTION;
    }

    // Reduce bonus based on hold factor
    const adjustedBonus = baseBonus * (1 - holdFactor);
    addScore(adjustedBonus);

    if (holdFactor > 0.15) {
      reasons.push("Hold heart for leader");
    } else {
      reasons.push("Dump heart");
    }
  }
}
