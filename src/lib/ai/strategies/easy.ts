/**
 * Easy AI Strategy
 *
 * Simple AI that plays the lowest valid card.
 * This is the baseline/original AI logic.
 */

import type { Card } from "../../../types/game";
import type { AIStrategy, PlayContext, PassContext } from "../types";
import { RANK, PASS_SCORES } from "../types";
import { isQueenOfSpades, isHeart } from "../../../game/rules";
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
    const scoredCards = hand.map((card) => {
      let score = 0;

      // Queen of spades - definitely pass it
      if (isQueenOfSpades(card)) {
        score += PASS_SCORES.QUEEN_OF_SPADES_UNPROTECTED;
      }

      // High hearts - we want to pass these
      if (isHeart(card)) {
        score += PASS_SCORES.HEART_BASE + card.rank;
      }

      // High cards in general are risky
      score += card.rank;

      // Ace and King of spades are dangerous if we don't have Q♠
      if (card.suit === "spades" && card.rank >= RANK.KING) {
        const hasQueen = hand.some(isQueenOfSpades);
        if (!hasQueen) {
          score += PASS_SCORES.HIGH_SPADE_NO_QUEEN;
        }
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
      contextInfo: `Passing ${context.gameState.passDirection}`,
    });

    return chosenCards;
  }

  /**
   * Choose a card to play
   * Strategy: Play lowest card of lead suit, or random suit when leading
   */
  chooseCardToPlay(context: PlayContext): Card {
    const { validCards, isLeading, leadSuit, gameState, playerIndex } = context;
    let decision: Card;
    let contextInfo = "";

    // If following suit, play the lowest card of that suit
    if (!isLeading && leadSuit) {
      const cardsOfLeadSuit = validCards.filter((c) => c.suit === leadSuit);
      if (cardsOfLeadSuit.length > 0) {
        decision = this.getLowestCard(cardsOfLeadSuit);
        contextInfo = `Following ${leadSuit}`;
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
      // Leading
      const cardsBySuit = this.groupBySuit(validCards);
      const suits = Array.from(cardsBySuit.keys());
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];
      const cardsOfSuit = cardsBySuit.get(randomSuit)!;
      decision = this.getLowestCard(cardsOfSuit);
      contextInfo = "Leading (random suit)";
    }

    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "easy",
      actionType: "play",
      roundNumber: gameState.roundNumber,
      decision,
      consideredCards: validCards.map((c) => ({
        card: c,
        score: 0,
        reasons: ["Easy AI does not score cards"],
      })),
      contextInfo,
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
