/**
 * Dump Card Scoring
 *
 * Normal: dump penalty cards (Q♠, hearts), high cards.
 * Moon shooting: keep penalty cards, dump low cards instead.
 */

import type { Card } from "../../../../types/game";
import type { PlayContext, ScoredCard, AIConfig } from "../../types";
import { RANK, DUMP_SCORES } from "../../constants";
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
  attemptingMoon = false
): ScoredCard[] {
  if (attemptingMoon) {
    return scoreMoonDump(validCards);
  }

  const { gameState, playerIndex, currentTrickCards } = context;
  const currentWinnerIndex = getCurrentTrickWinner(
    currentTrickCards,
    gameState
  );
  const leaderIndex = findLeader(gameState, config);

  return validCards.map((card) => {
    let score = DUMP_SCORES.BASE;
    const reasons: string[] = [];

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

    // Target leader
    if (
      leaderIndex !== null &&
      currentWinnerIndex === leaderIndex &&
      isPenaltyCard(card)
    ) {
      score += DUMP_SCORES.DUMP_ON_LEADER;
      reasons.push("Dump on leader");
    }

    // High non-penalty cards
    if (card.rank >= RANK.HIGH_THRESHOLD && !isPenaltyCard(card)) {
      if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
        // Keep high cards for moon defense
        score -= 40;
        reasons.push("Keep high card (moon defense)");
      } else {
        score += card.rank * DUMP_SCORES.HIGH_CARD_RANK_MULTIPLIER;
        reasons.push("Dump high card");
      }
    }

    // Keep low spades for Q♠ defense
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
  moonShooterIndex: number | null,
  playerIndex: number,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
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
