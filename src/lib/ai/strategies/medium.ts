/**
 * Medium AI Strategy
 *
 * Enhanced AI with:
 * - Penalty card avoidance
 * - Strategic Queen of Spades play
 * - Hearts breaking strategy
 * - Smarter passing (suit protection, voiding)
 */

import type { Card, GameState } from "../../../types/game";
import type {
  AIStrategy,
  PlayContext,
  PassContext,
  ScoredCard,
} from "../types";
import { AI_VERSION } from "../types";
import {
  RANK,
  THRESHOLDS,
  PASS_SCORES,
  LEAD_SCORES,
  FOLLOW_SCORES,
  DUMP_SCORES,
} from "../constants";
import { isQueenOfSpades, isHeart } from "../../../game/rules";
import { scoreCardsForPassing } from "../utils/cardScoring";
import {
  getPenaltyPointsInTrick,
  getHighestRankInTrick,
  isLastToPlay,
} from "../utils/trickAnalysis";
import { getSuitDistribution } from "../utils/suitAnalysis";
import { useAIDebugStore } from "../../../store/aiDebugStore";

export class MediumStrategy implements AIStrategy {
  readonly difficulty = "medium" as const;
  private queenOfSpadesPlayed = false;

  /**
   * Called when a new round starts - reset Q♠ tracking
   */
  onRoundStart(): void {
    this.queenOfSpadesPlayed = false;
  }

  /**
   * Called when a trick completes - check if Q♠ was played
   */
  onTrickComplete(
    trick: Array<{ playerId: string; card: Card }>,
    _winnerIndex: number,
    _trickNumber: number,
    _gameState?: GameState
  ): void {
    if (trick.some((play) => isQueenOfSpades(play.card))) {
      this.queenOfSpadesPlayed = true;
    }
  }

  /**
   * Choose 3 cards to pass
   * Strategy:
   * - Consider suit protection (don't pass if 4+ low cards protect high cards)
   * - Prefer voiding a suit (except spades if low spade count)
   * - Keep low spades for Q♠ protection
   */
  chooseCardsToPass(context: PassContext): Card[] {
    const { hand } = context;

    // Use the shared scoring utility with voiding consideration
    const scoredCards = scoreCardsForPassing(hand, true);

    // Additional Medium-specific adjustments
    this.adjustPassScoresForProtection(scoredCards, hand);

    // Sort and return top 3
    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCards = scoredCards.slice(0, 3).map((sc) => sc.card);

    useAIDebugStore.getState().addLog({
      playerId: context.gameState.players[context.playerIndex].id,
      playerName: context.gameState.players[context.playerIndex].name,
      difficulty: "medium",
      actionType: "pass",
      roundNumber: context.gameState.roundNumber,
      decision: chosenCards,
      consideredCards: scoredCards,
      aiVersion: AI_VERSION,
      contextInfo: `Passing ${context.gameState.passDirection}`,
    });

    return chosenCards;
  }

  /**
   * Adjust pass scores based on suit protection analysis
   */
  private adjustPassScoresForProtection(
    scoredCards: ScoredCard[],
    hand: Card[]
  ): void {
    const distribution = getSuitDistribution(hand);

    for (const scored of scoredCards) {
      const { card } = scored;

      // If this suit has 4+ cards, high cards are more protected
      if (
        distribution[card.suit] >= THRESHOLDS.PROTECTED_SUIT_SIZE &&
        card.rank >= RANK.HIGH_THRESHOLD
      ) {
        const lowCardsInSuit = hand.filter(
          (c) => c.suit === card.suit && c.rank < card.rank
        ).length;

        if (lowCardsInSuit >= THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION) {
          // Well protected - reduce pass priority
          scored.score += PASS_SCORES.PROTECTED_HIGH_CARD;
          scored.reasons?.push("Protected by low cards");
        }
      }

      // Extra protection for low spades (Q♠ defense)
      if (card.suit === "spades" && card.rank < RANK.QUEEN) {
        const lowSpadeCount = hand.filter(
          (c) => c.suit === "spades" && c.rank < RANK.QUEEN
        ).length;

        if (lowSpadeCount <= THRESHOLDS.CRITICAL_LOW_SPADE_COUNT) {
          // Very valuable low spades - don't pass
          scored.score += PASS_SCORES.CRITICAL_SPADE_DEFENSE;
          scored.reasons?.push("Critical spade protection");
        }
      }
    }
  }

  /**
   * Choose a card to play
   * Strategy:
   * - Analyze if we'll win the trick
   * - Avoid tricks with penalty cards
   * - Dump penalty cards when possible
   * - Strategic leading (avoid high cards early)
   */
  chooseCardToPlay(context: PlayContext): Card {
    const {
      validCards,
      isLeading,
      leadSuit,
      isFirstTrick,
      gameState,
      playerIndex,
      tricksPlayedThisRound,
    } = context;

    // First trick - must play 2 of clubs if we have it
    if (isFirstTrick) {
      const twoOfClubs = validCards.find(
        (c) => c.suit === "clubs" && c.rank === 2
      );
      if (twoOfClubs) {
        useAIDebugStore.getState().addLog({
          playerId: gameState.players[playerIndex].id,
          playerName: gameState.players[playerIndex].name,
          difficulty: "medium",
          actionType: "play",
          roundNumber: gameState.roundNumber,
          trickNumber: 1,
          decision: twoOfClubs,
          consideredCards: [
            { card: twoOfClubs, score: 1000, reasons: ["Must play 2♣"] },
          ],
          contextInfo: "First trick mandatory play",
          aiVersion: AI_VERSION,
        });
        return twoOfClubs;
      }
    }

    let scoredCards: ScoredCard[];
    let contextInfo: string;

    if (isLeading) {
      scoredCards = this.chooseLeadCard(context);
      contextInfo = "Leading";
    } else if (leadSuit) {
      const cardsOfSuit = validCards.filter((c) => c.suit === leadSuit);
      if (cardsOfSuit.length > 0) {
        scoredCards = this.chooseFollowCard(cardsOfSuit, context);
        contextInfo = `Following ${leadSuit}`;
      } else {
        scoredCards = this.chooseDumpCard(validCards, context);
        contextInfo = "Dumping (Void in suit)";
      }
    } else {
      // Should not be reachable if leadSuit is null (isLeading handled above)
      scoredCards = this.chooseDumpCard(validCards, context);
      contextInfo = "Dumping";
    }

    // Select best card
    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCard = scoredCards[0].card;

    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "medium",
      actionType: "play",
      roundNumber: gameState.roundNumber,
      trickNumber: tricksPlayedThisRound + 1,
      decision: chosenCard,
      consideredCards: scoredCards,
      contextInfo,
      aiVersion: AI_VERSION,
    });

    return chosenCard;
  }

  /**
   * Choose which card to lead with
   */
  private chooseLeadCard(context: PlayContext): ScoredCard[] {
    const { validCards, tricksPlayedThisRound } = context;

    // Score all valid cards for leading
    const scoredCards: ScoredCard[] = validCards.map((card) => {
      let score = LEAD_SCORES.BASE;
      const reasons: string[] = [];

      // Prefer leading low cards
      score -= card.rank * LEAD_SCORES.RANK_PENALTY_MULTIPLIER;

      // Penalize leading penalty cards based on their point values
      if (card.points > 0) {
        score -= card.points * LEAD_SCORES.RANK_PENALTY_MULTIPLIER * 2;
        reasons.push(
          `Leading risks ${card.points} point${card.points > 1 ? "s" : ""}!`
        );
      }

      // Avoid leading hearts (will get points dumped)
      if (isHeart(card) && !context.gameState.heartsBroken) {
        if (card.rank <= RANK.LOW_THRESHOLD) {
          score += LEAD_SCORES.FISH_FOR_QUEEN;
          reasons.push("Strategic low heart lead");
        } else {
          score += LEAD_SCORES.AVOID_HEARTS;
          reasons.push("Avoid leading hearts");
        }
      }

      // Spade Strategy
      if (card.suit === "spades") {
        const holdsQueen = validCards.some(isQueenOfSpades);

        if (
          !holdsQueen &&
          card.rank < RANK.QUEEN &&
          !this.queenOfSpadesPlayed
        ) {
          // Q♠ is still out there - fish for it
          score += LEAD_SCORES.FISH_FOR_QUEEN;
          reasons.push("Fishing for Q♠");
        } else if (
          !holdsQueen &&
          card.rank < RANK.QUEEN &&
          this.queenOfSpadesPlayed
        ) {
          // Q♠ already played - safe spade lead
          score += LEAD_SCORES.EARLY_SAFE_LEAD;
          reasons.push("Safe spade lead (Q♠ played)");
        } else if (holdsQueen && card.rank < RANK.QUEEN) {
          score += LEAD_SCORES.PRESERVE_QUEEN_PROTECTION;
          reasons.push("Preserve Q♠ protection");
        }

        if (card.rank >= RANK.QUEEN) {
          score += LEAD_SCORES.AVOID_HIGH_SPADES;
          reasons.push("Avoid high spades");
        }
      }

      // Early in round, mid-range cards are okay
      if (
        tricksPlayedThisRound < THRESHOLDS.EARLY_GAME_TRICKS &&
        card.rank >= RANK.MID_RANGE_MIN &&
        card.rank <= RANK.MID_RANGE_MAX
      ) {
        score += LEAD_SCORES.EARLY_SAFE_LEAD;
        reasons.push("Early safe lead");
      }

      // Prefer suits where we have low cards
      const suitCards = validCards.filter((c) => c.suit === card.suit);
      const lowestInSuit = Math.min(...suitCards.map((c) => c.rank));
      if (card.rank === lowestInSuit) {
        score += LEAD_SCORES.LOWEST_IN_SUIT;
        reasons.push("Lowest in suit");
      }

      return { card, score, reasons };
    });

    return scoredCards;
  }

  /**
   * Choose which card to play when following suit
   */
  private chooseFollowCard(
    cardsOfSuit: Card[],
    context: PlayContext
  ): ScoredCard[] {
    const { currentTrickCards, leadSuit } = context;

    const currentHighest = getHighestRankInTrick(currentTrickCards, leadSuit!);
    const penaltyPoints = getPenaltyPointsInTrick(currentTrickCards);
    const lastToPlay = isLastToPlay(currentTrickCards.length);

    const scoredCards: ScoredCard[] = cardsOfSuit.map((card) => {
      let score = FOLLOW_SCORES.BASE;
      const reasons: string[] = [];

      const wouldWin = card.rank > currentHighest;

      // CRITICAL: Check if playing this card would give us penalty points
      // Use the card's built-in point value
      if (wouldWin && card.points > 0 && !context.isFirstTrick) {
        // Playing a penalty card and winning = we take those points!
        score +=
          FOLLOW_SCORES.WIN_WITH_POINTS_BASE +
          card.points * FOLLOW_SCORES.PENALTY_POINTS_MULTIPLIER;
        reasons.push(`Would win with ${card.points} pts!`);
        if (card.points >= 13) {
          return { card, score, reasons }; // Q♠ is catastrophic, exit early
        }
      }

      // High spades (K♠, A♠) are dangerous when Q♠ is still out
      if (
        wouldWin &&
        card.suit === "spades" &&
        card.rank > RANK.QUEEN &&
        !this.queenOfSpadesPlayed &&
        !context.isFirstTrick
      ) {
        // Someone might dump Q♠ on us
        score += FOLLOW_SCORES.RISK_OF_DUMP * 2;
        reasons.push("High spade risk - Q♠ still out");
      }

      if (wouldWin) {
        if (context.isFirstTrick) {
          score += FOLLOW_SCORES.TRICK_1_SAFE_WIN;
          score += card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER;
          reasons.push("Trick 1 safe win");
        } else if (penaltyPoints > 0) {
          // Would win trick with penalties - bad!
          score +=
            FOLLOW_SCORES.WIN_WITH_POINTS_BASE +
            penaltyPoints * FOLLOW_SCORES.PENALTY_POINTS_MULTIPLIER;
          reasons.push(`Would win ${penaltyPoints} pts`);
        } else if (lastToPlay) {
          // Last to play, no penalties - safe to win
          score += FOLLOW_SCORES.SAFE_WIN_LAST_PLAYER;
          score += card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER; // Win efficiently
          reasons.push("Safe win as last player");
        } else {
          // Might get penalties dumped on us
          // Higher cards are MORE likely to win, so they're riskier
          // Scale the penalty based on how high the card is
          const riskMultiplier = card.rank / RANK.ACE; // 0.14 to 1.0
          score += FOLLOW_SCORES.RISK_OF_DUMP * (1 + riskMultiplier);
          reasons.push("Risk of penalty dump");
        }
      } else {
        // Playing under - good
        score += FOLLOW_SCORES.DUCK;
        reasons.push("Ducking");

        // Play highest card that still ducks (save lowest for later)
        score += card.rank;
      }

      return { card, score, reasons };
    });

    return scoredCards;
  }

  /**
   * Choose which card to dump when can't follow suit
   */
  private chooseDumpCard(
    validCards: Card[],
    _context: PlayContext
  ): ScoredCard[] {
    const scoredCards: ScoredCard[] = validCards.map((card) => {
      let score = DUMP_SCORES.BASE;
      const reasons: string[] = [];

      // Penalty cards - dump based on their point value
      if (card.points > 0) {
        // Higher points = more urgent to dump
        // Q♠ (13 pts) gets ~200+, hearts (1 pt) get ~53+
        score +=
          DUMP_SCORES.HEART_BASE +
          card.points * DUMP_SCORES.HEART_RANK_MULTIPLIER;
        reasons.push(`Dump ${card.points} pt card`);
      }

      // Other high cards (non-penalty)
      if (card.rank >= RANK.HIGH_THRESHOLD && card.points === 0) {
        score += card.rank * DUMP_SCORES.HIGH_CARD_RANK_MULTIPLIER;
        reasons.push("Dump high card");
      }

      // Keep low spades for Q♠ defense
      if (card.suit === "spades" && card.rank < RANK.QUEEN) {
        score += DUMP_SCORES.KEEP_LOW_SPADE;
        reasons.push("Keep low spade");
      }

      return { card, score, reasons };
    });

    return scoredCards;
  }
}
