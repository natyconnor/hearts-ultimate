/**
 * Easy AI Strategy
 *
 * Simple AI that plays the lowest valid card.
 * This is the baseline/original AI logic.
 */

import type { Card } from "../../../types/game";
import type { AIStrategy, PlayContext, PassContext } from "../types";
import { RANK, PASS_SCORES, AI_VERSION } from "../types";
import { isQueenOfSpades } from "../../../game/rules";
import { useAIDebugStore } from "../../../store/aiDebugStore";

export class EasyStrategy implements AIStrategy {
  readonly difficulty = "easy" as const;

  /**
   * Choose 3 cards to pass
   * Strategy: Pass high cards, especially penalty cards (Q♠, high hearts)
   */
  chooseCardsToPass(context: PassContext): Card[] {
    const { hand } = context;

    // Score each card based on how much we want to get rid of it
    // Higher score = want to pass it more
    // Priority: 1) Rank (high cards win tricks), 2) Dangerous spades, 3) Points as tiebreaker
    const scoredCards = hand.map((card) => {
      let score = 0;

      // Primary factor: High cards are risky because they win tricks
      // Scale by 10 to make it the dominant factor
      score += card.rank * 10;

      // Ace and King of spades are extremely dangerous if we don't have Q♠
      // They can catch the Q♠ and give us 13 points
      if (card.suit === "spades" && card.rank >= RANK.KING) {
        const hasQueen = hand.some(isQueenOfSpades);
        if (!hasQueen) {
          score += PASS_SCORES.HIGH_SPADE_NO_QUEEN;
        }
      }

      // Q♠ is dangerous to hold (worth 13 points if we win with it)
      if (isQueenOfSpades(card)) {
        score += 50; // Boost Q♠ passing priority
      }

      // Tiebreaker: Among cards of equal rank, prefer passing penalty cards
      // This is a small bonus (0-1) that only matters for ties
      if (card.points > 0) {
        score += card.points * 0.5; // Hearts get +0.5, Q♠ gets +6.5 (already boosted above)
      }

      return { card, score };
    });

    // Sort by score descending
    scoredCards.sort((a, b) => b.score - a.score);

    const chosenCards = scoredCards.slice(0, 3).map((sc) => sc.card);

    useAIDebugStore.getState().addLog({
      playerId: context.gameState.players[context.playerIndex].id,
      playerName: context.gameState.players[context.playerIndex].name,
      difficulty: "easy",
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
   * Choose a card to play
   * Strategy: Play lowest card of lead suit, or random non-heart suit when leading
   * Easy AI improvements:
   * - Prefer non-hearts when leading
   * - Basic Q♠ avoidance when following spades (play it only if forced)
   */
  chooseCardToPlay(context: PlayContext): Card {
    const {
      validCards,
      isLeading,
      leadSuit,
      gameState,
      playerIndex,
      tricksPlayedThisRound,
    } = context;
    let decision: Card;
    let contextInfo = "";

    // If following suit, play the lowest card of that suit
    if (!isLeading && leadSuit) {
      const cardsOfLeadSuit = validCards.filter((c) => c.suit === leadSuit);
      if (cardsOfLeadSuit.length > 0) {
        // Basic Q♠ avoidance: if following spades, try to avoid Q♠ unless forced
        if (leadSuit === "spades" && cardsOfLeadSuit.length > 1) {
          const nonQueenCards = cardsOfLeadSuit.filter(
            (c) => !isQueenOfSpades(c)
          );
          if (nonQueenCards.length > 0) {
            decision = this.getLowestCard(nonQueenCards);
            contextInfo = `Following ${leadSuit} (avoiding Q♠)`;
          } else {
            decision = this.getLowestCard(cardsOfLeadSuit);
            contextInfo = `Following ${leadSuit} (forced Q♠)`;
          }
        } else {
          decision = this.getLowestCard(cardsOfLeadSuit);
          contextInfo = `Following ${leadSuit}`;
        }
      } else {
        // Can't follow suit
        const cardsBySuit = this.groupBySuit(validCards);
        const suits = Array.from(cardsBySuit.keys());
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        const cardsOfSuit = cardsBySuit.get(randomSuit)!;
        decision = this.getLowestCard(cardsOfSuit);
        contextInfo = "Dumping (random suit)";
      }
    } else {
      // Leading - prefer non-hearts
      const cardsBySuit = this.groupBySuit(validCards);
      const suits = Array.from(cardsBySuit.keys());

      // Filter out hearts if other suits are available
      const nonHeartSuits = suits.filter((s) => s !== "hearts");
      const availableSuits = nonHeartSuits.length > 0 ? nonHeartSuits : suits;

      const randomSuit =
        availableSuits[Math.floor(Math.random() * availableSuits.length)];
      const cardsOfSuit = cardsBySuit.get(randomSuit)!;
      decision = this.getLowestCard(cardsOfSuit);
      contextInfo =
        nonHeartSuits.length > 0
          ? "Leading (random non-heart)"
          : "Leading (hearts only)";
    }

    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "easy",
      actionType: "play",
      roundNumber: gameState.roundNumber,
      trickNumber: tricksPlayedThisRound + 1,
      decision,
      consideredCards: validCards.map((c) => ({
        card: c,
        score: 0,
        reasons: ["Easy AI does not score cards"],
      })),
      contextInfo,
      aiVersion: AI_VERSION,
    });

    return decision;
  }

  private getLowestCard(cards: Card[]): Card {
    const sorted = [...cards].sort((a, b) => a.rank - b.rank);
    return sorted[0];
  }

  private groupBySuit(cards: Card[]): Map<string, Card[]> {
    const bySuit = new Map<string, Card[]>();
    for (const card of cards) {
      if (!bySuit.has(card.suit)) {
        bySuit.set(card.suit, []);
      }
      bySuit.get(card.suit)!.push(card);
    }
    return bySuit;
  }
}
