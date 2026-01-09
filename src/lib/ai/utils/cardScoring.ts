/**
 * Card Scoring Utilities
 *
 * Functions for scoring cards during passing and playing decisions.
 * Used by Medium and Hard AI strategies.
 */

import type { Card } from "../../../types/game";
import type { ScoredCard } from "../types";
import { RANK, THRESHOLDS, PASS_SCORES } from "../constants";
import { isQueenOfSpades } from "../../../game/rules";
import { getSuitDistribution, hasProtectedHighCards } from "./suitAnalysis";

/** Multiplier for unprotected high card score based on rank */
const UNPROTECTED_HIGH_CARD_MULTIPLIER = 5;
/** Multiplier for void opportunity score */
const VOID_OPPORTUNITY_MULTIPLIER = 8;
/** Score reduction for low spade protection */
const LOW_SPADE_PROTECTION_SCORE = -10;

/**
 * Score cards for the passing phase
 * Higher score = more desirable to pass away
 *
 * Priority order:
 * 1. Rank - high cards win tricks, which is bad
 * 2. Dangerous spades (A♠, K♠ without Q♠) - can catch Q♠
 * 3. Q♠ without protection - worth 13 pts if we win with it
 * 4. Voiding opportunities - being void lets us dump penalty cards
 *    BUT only for mid-high cards (6+), never pass low cards to void!
 * 5. Card points as tiebreaker - among equal rank, hearts slightly worse
 */
export function scoreCardsForPassing(
  hand: Card[],
  considerVoiding: boolean = true
): ScoredCard[] {
  const distribution = getSuitDistribution(hand);
  const scoredCards: ScoredCard[] = [];

  for (const card of hand) {
    let score = 0;
    const reasons: string[] = [];

    // CRITICAL: Low cards (2-5) are extremely valuable for ducking
    // Never pass these just to void a suit - they're "get out of jail free" cards
    if (card.rank < PASS_SCORES.LOW_CARD_THRESHOLD) {
      score += PASS_SCORES.LOW_CARD_PROTECTION;
      reasons.push("Valuable low card for ducking");
    }

    // PRIMARY FACTOR: High cards are risky because they win tricks
    // This should be the dominant factor - scale by 10
    if (card.rank >= RANK.HIGH_THRESHOLD) {
      // Jack or higher - these are dangerous
      const isProtected = hasProtectedHighCards(hand, card.suit);
      if (!isProtected) {
        score +=
          (card.rank - RANK.MID_RANGE_MAX) * UNPROTECTED_HIGH_CARD_MULTIPLIER;
        reasons.push("Unprotected high card");
      }
    }

    // Ace and King of spades are EXTREMELY dangerous without Q♠
    // They can catch the Q♠ and give us 13 points
    if (card.suit === "spades" && card.rank >= RANK.KING) {
      const hasQueen = hand.some(isQueenOfSpades);
      if (!hasQueen) {
        score += PASS_SCORES.HIGH_SPADE_NO_QUEEN;
        reasons.push("High spade without Q♠");
      }
    }

    // Queen of Spades - high priority to pass (unless well protected)
    if (isQueenOfSpades(card)) {
      const lowSpades = hand.filter(
        (c) => c.suit === "spades" && c.rank < RANK.QUEEN
      ).length;

      if (lowSpades < THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION) {
        score += PASS_SCORES.QUEEN_OF_SPADES_UNPROTECTED;
        reasons.push("Q♠ without protection");
      } else {
        score += PASS_SCORES.QUEEN_OF_SPADES_PROTECTED;
        reasons.push("Q♠ with some protection");
      }
    }

    // Voiding strategy - prefer passing from short suits
    // BUT only for cards rank 6+ (low cards are too valuable to pass for voiding)
    if (considerVoiding && card.rank >= PASS_SCORES.LOW_CARD_THRESHOLD) {
      const suitCount = distribution[card.suit];
      if (
        suitCount <= THRESHOLDS.CRITICAL_LOW_SPADE_COUNT &&
        card.suit !== "spades"
      ) {
        // Don't void spades (want low spades for Q♠ protection)
        score +=
          (THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION - suitCount) *
          VOID_OPPORTUNITY_MULTIPLIER;
        reasons.push(`Void opportunity (${suitCount} in suit)`);
      }
    }

    // Low spades are valuable - reduce their pass score
    if (card.suit === "spades" && card.rank < RANK.QUEEN) {
      score += LOW_SPADE_PROTECTION_SCORE;
      reasons.push("Low spade protection");
    }

    // TIEBREAKER: Among cards of similar rank, prefer passing penalty cards
    // Hearts are marginally worse to keep than non-hearts of the same rank
    // This is a small bonus that only matters for ties
    if (card.points > 0 && !isQueenOfSpades(card)) {
      // Small bonus for hearts (don't double-count Q♠ which is already boosted)
      score += card.points; // +1 for hearts
      reasons.push("Heart penalty card");
    }

    scoredCards.push({ card, score, reasons });
  }

  return scoredCards;
}
