/**
 * Moon Hand Evaluation
 *
 * Evaluates whether a hand is suitable for shooting the moon.
 * Key factors: A♥ (critical), Q♠ control, high cards across suits, suit length.
 */

import type { Card, CardSuit } from "../../../../types/game";
import { isQueenOfSpades } from "../../../../game/rules";
import { getSuitDistribution } from "../../utils/suitAnalysis";
import { RANK } from "../../constants";

export interface MoonEvaluation {
  shouldAttempt: boolean;
  confidence: number;
  reasons: string[];
  score: number;
}

const MOON_EVAL = {
  ATTEMPT_THRESHOLD: 75,
  HIGH_CONFIDENCE_THRESHOLD: 80,

  // Critical cards
  ACE_OF_HEARTS: 25,
  QUEEN_OF_SPADES: 20,
  KING_OF_SPADES: 12,
  ACE_OF_SPADES: 15,

  // High cards
  ACE_BONUS: 8,
  KING_BONUS: 6,
  QUEEN_BONUS: 4,

  // Suit control
  SUIT_CONTROL_WITH_ACE: 10,
  LONG_HEARTS: 8,
  VERY_LONG_SUIT_PER_CARD: 5,

  // Penalties
  MISSING_ACE_OF_HEARTS: -30,
  UNCONTROLLED_QUEEN_OF_SPADES: -50,
  SHORT_SUIT_NO_CONTROL: -8,
  LOW_CARD_PENALTY_PER_CARD: -3,
} as const;

/**
 * Evaluates whether a hand is suitable for shooting the moon.
 *
 * @param hand The player's hand
 * @param thresholdAdjustment Adjustment to the attempt threshold from aggressiveness
 *                            (negative = more likely to attempt, positive = less likely)
 */
export function evaluateMoonPotential(
  hand: Card[],
  thresholdAdjustment: number = 0
): MoonEvaluation {
  let score = 0;
  const reasons: string[] = [];
  const distribution = getSuitDistribution(hand);
  const adjustedThreshold = MOON_EVAL.ATTEMPT_THRESHOLD + thresholdAdjustment;

  // Critical cards
  const hasAceOfHearts = hand.some(
    (c) => c.suit === "hearts" && c.rank === RANK.ACE
  );
  const hasQueenOfSpades = hand.some(isQueenOfSpades);
  const hasKingOfSpades = hand.some(
    (c) => c.suit === "spades" && c.rank === RANK.KING
  );
  const hasAceOfSpades = hand.some(
    (c) => c.suit === "spades" && c.rank === RANK.ACE
  );

  if (hasAceOfHearts) {
    score += MOON_EVAL.ACE_OF_HEARTS;
    reasons.push("Has A♥ (critical)");
  } else {
    score += MOON_EVAL.MISSING_ACE_OF_HEARTS;
    reasons.push("Missing A♥ (very risky)");
  }

  // Q♠ control
  if (hasQueenOfSpades) {
    score += MOON_EVAL.QUEEN_OF_SPADES;
    reasons.push("Has Q♠");
  } else if (hasAceOfSpades && hasKingOfSpades) {
    score += MOON_EVAL.ACE_OF_SPADES + MOON_EVAL.KING_OF_SPADES;
    reasons.push("Has A♠+K♠ (can catch Q♠)");
  } else if (hasAceOfSpades) {
    score += MOON_EVAL.ACE_OF_SPADES;
    reasons.push("Has A♠ (might catch Q♠)");
  } else if (hasKingOfSpades) {
    score += MOON_EVAL.KING_OF_SPADES * 0.5;
    reasons.push("Has K♠ only");
  } else {
    score += MOON_EVAL.UNCONTROLLED_QUEEN_OF_SPADES;
    reasons.push("No Q♠ control (dangerous)");
  }

  // High card count
  const highCardsBySuit = countHighCardsBySuit(hand);
  let totalHighCards = 0;
  let suitsWithHighCards = 0;

  for (const suit of ["clubs", "diamonds", "spades", "hearts"] as CardSuit[]) {
    const { aces, kings, queens } = highCardsBySuit[suit];
    const suitHighCards = aces + kings + queens;
    totalHighCards += suitHighCards;

    if (suitHighCards > 0) suitsWithHighCards++;

    // Score individual high cards (A♥ and K♠ already counted)
    if (aces > 0 && suit !== "hearts") score += MOON_EVAL.ACE_BONUS;
    if (kings > 0 && suit !== "spades") score += MOON_EVAL.KING_BONUS;
    if (queens > 0 && suit !== "spades") score += MOON_EVAL.QUEEN_BONUS;
  }

  if (totalHighCards >= 6) reasons.push(`Strong: ${totalHighCards} high cards`);
  else if (totalHighCards >= 4)
    reasons.push(`Decent: ${totalHighCards} high cards`);
  else reasons.push(`Weak: only ${totalHighCards} high cards`);

  if (suitsWithHighCards >= 3) {
    score += 10;
    reasons.push("High cards in 3+ suits");
  }

  // Suit length analysis
  for (const suit of ["clubs", "diamonds", "spades", "hearts"] as CardSuit[]) {
    const count = distribution[suit];
    const hasAce = hand.some((c) => c.suit === suit && c.rank === RANK.ACE);

    if (count >= 4 && hasAce) {
      score += MOON_EVAL.SUIT_CONTROL_WITH_ACE;
      reasons.push(`Controls ${suit} (${count} cards + A)`);
    }

    if (count >= 7) {
      score += (count - 6) * MOON_EVAL.VERY_LONG_SUIT_PER_CARD;
      reasons.push(`Long ${suit}: ${count} cards`);
    }

    if (suit === "hearts" && count >= 5) {
      score += MOON_EVAL.LONG_HEARTS;
      reasons.push(`${count} hearts`);
    }

    if (count > 0 && count <= 2 && !hasAce) {
      score += MOON_EVAL.SHORT_SUIT_NO_CONTROL;
      reasons.push(`Weak in ${suit} (${count} cards, no A)`);
    }
  }

  // Low card penalty
  const lowCards = hand.filter((c) => c.rank <= 5).length;
  if (lowCards >= 5) {
    score += (lowCards - 4) * MOON_EVAL.LOW_CARD_PENALTY_PER_CARD;
    reasons.push(`${lowCards} low cards (hard to win)`);
  }

  const confidence = Math.max(0, Math.min(100, score));
  return {
    shouldAttempt: score >= adjustedThreshold,
    confidence,
    reasons,
    score,
  };
}

function countHighCardsBySuit(
  hand: Card[]
): Record<CardSuit, { queens: number; kings: number; aces: number }> {
  const result: Record<
    CardSuit,
    { queens: number; kings: number; aces: number }
  > = {
    clubs: { queens: 0, kings: 0, aces: 0 },
    diamonds: { queens: 0, kings: 0, aces: 0 },
    spades: { queens: 0, kings: 0, aces: 0 },
    hearts: { queens: 0, kings: 0, aces: 0 },
  };

  for (const card of hand) {
    if (card.rank === RANK.QUEEN) result[card.suit].queens++;
    if (card.rank === RANK.KING) result[card.suit].kings++;
    if (card.rank === RANK.ACE) result[card.suit].aces++;
  }

  return result;
}

/** Get cards to KEEP when shooting (inverse of normal passing) */
export function getMoonKeepCards(hand: Card[]): Card[] {
  return hand.filter((card) => {
    // Always keep critical cards
    if (card.suit === "hearts" && card.rank === RANK.ACE) return true;
    if (isQueenOfSpades(card)) return true;
    if (card.suit === "spades" && card.rank >= RANK.KING) return true;

    // Keep high cards (Q, K, A)
    if (card.rank >= RANK.QUEEN) return true;

    // Keep high-ish hearts
    if (card.suit === "hearts" && card.rank >= RANK.MID_RANGE_MAX) return true;

    return false;
  });
}

/** Score cards for passing when shooting (pass LOW, keep HIGH) */
export function scoreMoonPassCards(
  hand: Card[]
): Array<{ card: Card; score: number; reasons: string[] }> {
  const keepCards = getMoonKeepCards(hand);
  const distribution = getSuitDistribution(hand);

  return hand.map((card) => {
    let score = 0;
    const reasons: string[] = [];

    const isKeepCard = keepCards.some(
      (k) => k.suit === card.suit && k.rank === card.rank
    );

    if (isKeepCard) {
      score -= 150;
      reasons.push("Critical for moon shot");
    }

    // Rank-based scoring (low = good to pass)
    if (card.rank <= 5) {
      score += 80 + (6 - card.rank) * 10;
      reasons.push(`Low card (${card.rank}) - pass!`);
    } else if (card.rank <= 8) {
      score += 40 + (9 - card.rank) * 5;
      reasons.push("Mid-low card");
    } else if (card.rank <= 10) {
      score -= 20;
      reasons.push("Mid card - prefer to keep");
    } else {
      score -= 60 + (card.rank - 10) * 10;
      reasons.push("High card - KEEP!");
    }

    // Prefer passing from short suits
    if (distribution[card.suit] <= 2 && card.rank < RANK.QUEEN) {
      score += 15;
      reasons.push("Short suit, non-critical");
    }

    // Never pass critical cards
    if (card.suit === "hearts" && card.rank === RANK.ACE) {
      score -= 200;
      reasons.push("NEVER pass A♥");
    }
    if (isQueenOfSpades(card)) {
      score -= 200;
      reasons.push("NEVER pass Q♠ when shooting");
    }
    if (card.suit === "spades" && card.rank >= RANK.KING) {
      score -= 150;
      reasons.push("NEVER pass high spades");
    }

    return { card, score, reasons };
  });
}
