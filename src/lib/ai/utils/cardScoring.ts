/**
 * Card Scoring Utilities
 *
 * Functions for scoring cards during passing and playing decisions.
 * Used by Medium and Hard AI strategies.
 */

import type { Card } from "../../../types/game";
import type { ScoredCard } from "../types";
import { RANK, THRESHOLDS, PASS_SCORES } from "../types";
import { isHeart, isQueenOfSpades } from "../../../game/rules";
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

    // Queen of Spades - very high priority to pass (unless well protected)
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

    // High hearts - want to pass these
    if (isHeart(card)) {
      score += PASS_SCORES.HEART_BASE + card.rank;
      reasons.push("Heart penalty card");
    }

    // High cards in general are risky
    if (card.rank >= RANK.HIGH_THRESHOLD) {
      // Jack or higher
      const isProtected = hasProtectedHighCards(hand, card.suit);
      if (!isProtected) {
        score +=
          (card.rank - RANK.MID_RANGE_MAX) * UNPROTECTED_HIGH_CARD_MULTIPLIER;
        reasons.push("Unprotected high card");
      }
    }

    // Ace and King of spades are dangerous without Q♠
    if (card.suit === "spades" && card.rank >= RANK.KING) {
      const hasQueen = hand.some(isQueenOfSpades);
      if (!hasQueen) {
        score += PASS_SCORES.HIGH_SPADE_NO_QUEEN;
        reasons.push("High spade without Q♠");
      }
    }

    // Voiding strategy - prefer passing from short suits
    if (considerVoiding) {
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

    scoredCards.push({ card, score, reasons });
  }

  return scoredCards;
}

/**
 * Get the highest scored card from a list
 */
export function selectHighestScoredCard(scoredCards: ScoredCard[]): Card {
  if (scoredCards.length === 0) {
    throw new Error("No cards to select from");
  }

  // Sort by score descending
  const sorted = [...scoredCards].sort((a, b) => b.score - a.score);
  return sorted[0].card;
}
