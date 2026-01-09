/**
 * Dump Card Scoring for Hard AI
 *
 * Scores cards for when we can't follow suit (dumping).
 *
 * When shooting the moon: Keep penalty cards! Dump low cards instead.
 */

import type { Card } from "../../../../types/game";
import type { PlayContext, ScoredCard, AIConfig } from "../../types";
import { RANK, DUMP_SCORES } from "../../types";
import {
  isQueenOfSpades,
  isHeart,
  isPenaltyCard,
} from "../../../../game/rules";
import type { CardMemory } from "../../memory/cardMemory";
import {
  findLeader,
  getCurrentTrickWinner,
  isQueenOfSpadesInTrick,
} from "./hardHelpers";

/**
 * Score cards for dumping (can't follow suit)
 */
export function scoreDumpCards(
  validCards: Card[],
  context: PlayContext,
  memory: CardMemory,
  config: AIConfig,
  moonShooterIndex: number | null,
  attemptingMoon: boolean = false
): ScoredCard[] {
  const { gameState, playerIndex, currentTrickCards } = context;

  // When shooting moon, we DON'T want to dump penalty cards
  if (attemptingMoon) {
    return scoreMoonDumpCards(validCards, context);
  }

  const currentWinnerIndex = getCurrentTrickWinner(
    currentTrickCards,
    gameState
  );
  const leaderIndex = findLeader(gameState, config);

  return validCards.map((card) => {
    let score = DUMP_SCORES.BASE;
    const reasons: string[] = [];

    // Q♠ - highest priority dump (usually)
    if (isQueenOfSpades(card)) {
      scoreQueenDump(
        currentWinnerIndex,
        moonShooterIndex,
        playerIndex,
        reasons,
        (adj) => {
          score += adj;
        }
      );
    }

    // Hearts
    if (isHeart(card)) {
      scoreHeartDump(
        card,
        currentWinnerIndex,
        moonShooterIndex,
        playerIndex,
        reasons,
        (adj) => {
          score += adj;
        }
      );
    }

    // Leader targeting - dump points on the leader
    if (leaderIndex !== null && currentWinnerIndex === leaderIndex) {
      if (isPenaltyCard(card)) {
        score += DUMP_SCORES.DUMP_ON_LEADER;
        reasons.push("Dump on leader");
      }
    }

    // Other high cards - but KEEP them if someone is shooting!
    if (card.rank >= RANK.HIGH_THRESHOLD && !isPenaltyCard(card)) {
      if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
        // Someone else is shooting - KEEP high cards to maintain control!
        // We need these to potentially win tricks and stop the moon
        score -= 40;
        reasons.push("Keep high card (moon defense)");
      } else {
        // Normal play - dump high cards
        score += card.rank * DUMP_SCORES.HIGH_CARD_RANK_MULTIPLIER;
        reasons.push("Dump high card");
      }
    }

    // Keep low spades
    if (card.suit === "spades" && card.rank < RANK.QUEEN) {
      const queenAccountedFor =
        isQueenOfSpadesInTrick(currentTrickCards) ||
        memory.isQueenOfSpadesPlayed();

      if (!queenAccountedFor) {
        score += DUMP_SCORES.HARD_KEEP_SPADE_QUEEN_OUT;
        reasons.push("Keep spade - Q♠ still out");
      } else {
        score += DUMP_SCORES.HARD_KEEP_LOW_SPADE;
        reasons.push("Keep low spade");
      }
    }

    return { card, score, reasons };
  });
}

/**
 * Score cards for dumping when attempting to shoot the moon
 * Strategy: KEEP penalty cards (we want to collect them all!)
 *           DUMP low non-penalty cards instead
 */
function scoreMoonDumpCards(
  validCards: Card[],
  _context: PlayContext
): ScoredCard[] {
  return validCards.map((card) => {
    let score = DUMP_SCORES.BASE;
    const reasons: string[] = [];

    // NEVER dump penalty cards when shooting (we need them!)
    if (isPenaltyCard(card)) {
      score -= 200;
      reasons.push("Moon: KEEP penalty cards!");
    }

    // Prefer dumping low cards (save high cards for winning tricks)
    if (card.rank <= 5) {
      score += 50 + (6 - card.rank) * 5;
      reasons.push("Moon: dump low card");
    } else if (card.rank <= 8) {
      score += 30;
      reasons.push("Moon: dump mid card");
    }

    // Avoid dumping high cards (need them to win tricks)
    if (card.rank >= RANK.HIGH_THRESHOLD && !isPenaltyCard(card)) {
      score -= 30;
      reasons.push("Moon: keep high cards for control");
    }

    return { card, score, reasons };
  });
}

/**
 * Score dumping the Queen of Spades
 */
function scoreQueenDump(
  currentWinnerIndex: number | null,
  moonShooterIndex: number | null,
  playerIndex: number,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
    // Don't dump Q♠ on moon shooter - it helps them!
    if (currentWinnerIndex === moonShooterIndex) {
      addScore(DUMP_SCORES.DONT_GIVE_QUEEN_TO_SHOOTER);
      reasons.push("Don't give Q♠ to moon shooter");
    } else {
      addScore(DUMP_SCORES.DUMP_ON_NON_SHOOTER);
      reasons.push("Dump Q♠ on non-shooter");
    }
  } else {
    addScore(DUMP_SCORES.QUEEN_OF_SPADES);
    reasons.push("Dump Q♠!");
  }
}

/**
 * Score dumping a heart
 */
function scoreHeartDump(
  card: Card,
  currentWinnerIndex: number | null,
  moonShooterIndex: number | null,
  playerIndex: number,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
    if (currentWinnerIndex === moonShooterIndex) {
      addScore(DUMP_SCORES.DONT_GIVE_HEARTS_TO_SHOOTER);
      reasons.push("Don't give hearts to shooter");
    } else {
      addScore(
        DUMP_SCORES.HEART_BASE + card.rank * DUMP_SCORES.HEART_RANK_MULTIPLIER
      );
      reasons.push("Dump heart on non-shooter");
    }
  } else {
    addScore(
      DUMP_SCORES.HEART_BASE + card.rank * DUMP_SCORES.HEART_RANK_MULTIPLIER
    );
    reasons.push("Dump heart");
  }
}
