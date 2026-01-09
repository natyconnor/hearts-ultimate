/**
 * Moon Hand Evaluation for Hard AI
 *
 * Evaluates whether a hand is suitable for attempting to shoot the moon.
 * This is checked during the passing phase to adjust strategy.
 *
 * Key factors for a moon-worthy hand:
 * 1. High card control - Need Q, K, A across multiple suits to win tricks
 * 2. Critical cards - A♥ (mandatory), Q♠ (have it or can catch it)
 * 3. Suit length - Long suits with high cards can run the table
 * 4. Spade safety - Need Q♠ or high spades to catch/control it
 */

import type { Card, CardSuit } from "../../../../types/game";
import { isQueenOfSpades } from "../../../../game/rules";
import { getSuitDistribution } from "../../utils/suitAnalysis";
import { RANK } from "../../types";

/**
 * Result of moon hand evaluation
 */
export interface MoonEvaluation {
  /** Whether the AI should attempt to shoot the moon */
  shouldAttempt: boolean;
  /** Confidence level 0-100 */
  confidence: number;
  /** Reasons for the decision (for debugging) */
  reasons: string[];
  /** The evaluated score (for debugging) */
  score: number;
}

/**
 * Thresholds for moon evaluation
 */
const MOON_EVAL = {
  /** Minimum score to attempt shooting */
  ATTEMPT_THRESHOLD: 65,
  /** High confidence threshold */
  HIGH_CONFIDENCE_THRESHOLD: 80,

  // Critical card bonuses
  /** Ace of hearts - almost mandatory for shooting */
  ACE_OF_HEARTS: 25,
  /** Queen of spades - need to have or catch */
  QUEEN_OF_SPADES: 20,
  /** King of spades (can catch Q♠) */
  KING_OF_SPADES: 12,
  /** Ace of spades (can catch Q♠) */
  ACE_OF_SPADES: 15,

  // High card bonuses (per card)
  /** Ace in any suit */
  ACE_BONUS: 8,
  /** King in any suit */
  KING_BONUS: 6,
  /** Queen in any suit (except Q♠ which is separate) */
  QUEEN_BONUS: 4,

  // Suit control bonuses
  /** Bonus for having 4+ cards in a suit with the ace */
  SUIT_CONTROL_WITH_ACE: 10,
  /** Bonus for having 5+ cards in hearts */
  LONG_HEARTS: 8,
  /** Bonus for each card in a 7+ card suit */
  VERY_LONG_SUIT_PER_CARD: 5,

  // Penalties
  /** Missing ace of hearts - very risky */
  MISSING_ACE_OF_HEARTS: -30,
  /** Missing Q♠ and no high spades to catch it - nearly disqualifying */
  UNCONTROLLED_QUEEN_OF_SPADES: -50,
  /** Penalty for each suit with only 1-2 cards and no ace */
  SHORT_SUIT_NO_CONTROL: -8,
  /** Penalty for having many low cards (hard to win tricks) */
  LOW_CARD_PENALTY_PER_CARD: -3,
} as const;

/**
 * Evaluate whether a hand is suitable for shooting the moon
 */
export function evaluateMoonPotential(hand: Card[]): MoonEvaluation {
  let score = 0;
  const reasons: string[] = [];

  const distribution = getSuitDistribution(hand);

  // === CRITICAL CARDS ===
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

  // Ace of Hearts is almost mandatory
  if (hasAceOfHearts) {
    score += MOON_EVAL.ACE_OF_HEARTS;
    reasons.push("Has A♥ (critical)");
  } else {
    score += MOON_EVAL.MISSING_ACE_OF_HEARTS;
    reasons.push("Missing A♥ (very risky)");
  }

  // Queen of Spades control
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
    score += MOON_EVAL.KING_OF_SPADES * 0.5; // Less valuable alone
    reasons.push("Has K♠ only");
  } else {
    score += MOON_EVAL.UNCONTROLLED_QUEEN_OF_SPADES;
    reasons.push("No Q♠ control (dangerous)");
  }

  // === HIGH CARD COUNT ===
  const highCardsBySuit = countHighCardsBySuit(hand);
  let totalHighCards = 0;
  let suitsWithHighCards = 0;

  for (const suit of ["clubs", "diamonds", "spades", "hearts"] as CardSuit[]) {
    const { aces, kings, queens } = highCardsBySuit[suit];
    const suitHighCards = aces + kings + queens;
    totalHighCards += suitHighCards;

    if (suitHighCards > 0) {
      suitsWithHighCards++;
    }

    // Score individual high cards (Q♠ already counted)
    if (aces > 0 && !(suit === "hearts")) {
      // A♥ already counted
      score += MOON_EVAL.ACE_BONUS;
    }
    if (kings > 0 && !(suit === "spades")) {
      // K♠ already counted if present
      score += MOON_EVAL.KING_BONUS;
    }
    if (queens > 0 && suit !== "spades") {
      score += MOON_EVAL.QUEEN_BONUS;
    }
  }

  if (totalHighCards >= 6) {
    reasons.push(`Strong: ${totalHighCards} high cards`);
  } else if (totalHighCards >= 4) {
    reasons.push(`Decent: ${totalHighCards} high cards`);
  } else {
    reasons.push(`Weak: only ${totalHighCards} high cards`);
  }

  // Bonus for high cards spread across suits
  if (suitsWithHighCards >= 3) {
    score += 10;
    reasons.push("High cards in 3+ suits");
  }

  // === SUIT LENGTH ANALYSIS ===
  for (const suit of ["clubs", "diamonds", "spades", "hearts"] as CardSuit[]) {
    const count = distribution[suit];
    const hasAce = hand.some((c) => c.suit === suit && c.rank === RANK.ACE);

    // Long suit with ace = control
    if (count >= 4 && hasAce) {
      score += MOON_EVAL.SUIT_CONTROL_WITH_ACE;
      reasons.push(`Controls ${suit} (${count} cards + A)`);
    }

    // Very long suit (7+) is powerful
    if (count >= 7) {
      const bonus = (count - 6) * MOON_EVAL.VERY_LONG_SUIT_PER_CARD;
      score += bonus;
      reasons.push(`Long ${suit}: ${count} cards`);
    }

    // Long hearts is good (more chances to collect them all)
    if (suit === "hearts" && count >= 5) {
      score += MOON_EVAL.LONG_HEARTS;
      reasons.push(`${count} hearts`);
    }

    // Short suits without control are dangerous
    if (count > 0 && count <= 2 && !hasAce) {
      score += MOON_EVAL.SHORT_SUIT_NO_CONTROL;
      reasons.push(`Weak in ${suit} (${count} cards, no A)`);
    }
  }

  // === LOW CARD PENALTY ===
  const lowCards = hand.filter((c) => c.rank <= 5).length;
  if (lowCards >= 5) {
    const penalty = (lowCards - 4) * MOON_EVAL.LOW_CARD_PENALTY_PER_CARD;
    score += penalty;
    reasons.push(`${lowCards} low cards (hard to win)`);
  }

  // === GAME STATE CONSIDERATIONS ===
  // (Could add: if far behind in score, more willing to attempt)

  // Calculate confidence (0-100 scale)
  const confidence = Math.max(0, Math.min(100, score));
  const shouldAttempt = score >= MOON_EVAL.ATTEMPT_THRESHOLD;

  return {
    shouldAttempt,
    confidence,
    reasons,
    score,
  };
}

/**
 * Count high cards (Q, K, A) by suit
 */
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

/**
 * Get cards that are good to KEEP when shooting the moon
 * (inverse of normal passing - keep high cards, pass low cards)
 */
export function getMoonKeepCards(hand: Card[]): Card[] {
  const keepCards: Card[] = [];

  for (const card of hand) {
    // Always keep these critical cards
    if (card.suit === "hearts" && card.rank === RANK.ACE) {
      keepCards.push(card);
      continue;
    }
    if (isQueenOfSpades(card)) {
      keepCards.push(card);
      continue;
    }
    if (card.suit === "spades" && card.rank >= RANK.KING) {
      keepCards.push(card);
      continue;
    }

    // Keep all high cards (Q, K, A)
    if (card.rank >= RANK.QUEEN) {
      keepCards.push(card);
      continue;
    }

    // Keep high-ish cards in hearts (need to win them all)
    if (card.suit === "hearts" && card.rank >= RANK.MID_RANGE_MAX) {
      keepCards.push(card);
      continue;
    }
  }

  return keepCards;
}

/**
 * Score cards for passing when attempting to shoot the moon
 * Higher score = more desirable to pass (opposite of normal!)
 *
 * Priority: Pass LOW cards (2-5), keep HIGH cards (10+)
 */
export function scoreMoonPassCards(
  hand: Card[]
): Array<{ card: Card; score: number; reasons: string[] }> {
  const keepCards = getMoonKeepCards(hand);

  return hand.map((card) => {
    let score = 0;
    const reasons: string[] = [];

    // Check if this is a "must keep" card
    const isKeepCard = keepCards.some(
      (k) => k.suit === card.suit && k.rank === card.rank
    );

    if (isKeepCard) {
      score -= 150; // Strong penalty for passing critical cards
      reasons.push("Critical for moon shot");
    }

    // === RANK-BASED SCORING ===
    // Low cards (2-5) are BEST to pass - we can't win tricks with them
    if (card.rank <= 5) {
      score += 80 + (6 - card.rank) * 10; // 2=120, 3=110, 4=100, 5=90
      reasons.push(`Low card (${card.rank}) - pass!`);
    }
    // Mid-low cards (6-8) are okay to pass
    else if (card.rank <= 8) {
      score += 40 + (9 - card.rank) * 5; // 6=55, 7=50, 8=45
      reasons.push("Mid-low card");
    }
    // Mid cards (9-10) - slight negative, we might need these
    else if (card.rank <= 10) {
      score -= 20;
      reasons.push("Mid card - prefer to keep");
    }
    // High cards (J, Q, K, A) - strongly avoid passing
    else {
      score -= 60 + (card.rank - 10) * 10; // J=-70, Q=-80, K=-90, A=-100
      reasons.push("High card - KEEP!");
    }

    // Prefer passing from short suits (helps void for later)
    const distribution = getSuitDistribution(hand);
    if (distribution[card.suit] <= 2 && card.rank < RANK.QUEEN) {
      score += 15;
      reasons.push("Short suit, non-critical");
    }

    // Never pass A♥
    if (card.suit === "hearts" && card.rank === RANK.ACE) {
      score -= 200;
      reasons.push("NEVER pass A♥");
    }

    // Never pass Q♠ when shooting
    if (isQueenOfSpades(card)) {
      score -= 200;
      reasons.push("NEVER pass Q♠ when shooting");
    }

    // Never pass high spades (need them to catch/play Q♠)
    if (card.suit === "spades" && card.rank >= RANK.KING) {
      score -= 150;
      reasons.push("NEVER pass high spades");
    }

    return { card, score, reasons };
  });
}
