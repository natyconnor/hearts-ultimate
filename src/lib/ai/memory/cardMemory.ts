/**
 * Card Memory System for Hard AI
 *
 * Implements recency-biased memory that remembers approximately 50% of cards.
 * More recent cards are more likely to be remembered.
 * Tracks:
 * - Which cards have been played
 * - Who played each card
 * - Which players are void in which suits
 */

import type { Card, CardSuit } from "../../../types/game";
import type { PlayedCardMemory } from "../types";
import { DEFAULT_AI_CONFIG } from "../types";

export class CardMemory {
  private playedCards: PlayedCardMemory[] = [];
  private playerVoids: Map<string, Set<CardSuit>> = new Map();
  private currentTrickNumber: number = 0;
  private memoryTrickCount: number;

  constructor(memoryTrickCount: number = DEFAULT_AI_CONFIG.memoryTrickCount) {
    this.memoryTrickCount = memoryTrickCount;
  }

  /**
   * Reset memory for a new round
   */
  reset(): void {
    this.playedCards = [];
    this.playerVoids.clear();
    this.currentTrickNumber = 0;
  }

  /**
   * Record a completed trick
   */
  recordTrick(
    trick: Array<{ playerId: string; card: Card }>,
    playerIndices: Map<string, number>,
    leadSuit: CardSuit
  ): void {
    for (const play of trick) {
      const playerIndex = playerIndices.get(play.playerId) ?? -1;
      const wasVoidPlay = play.card.suit !== leadSuit;

      this.playedCards.push({
        card: play.card,
        playerId: play.playerId,
        playerIndex,
        trickNumber: this.currentTrickNumber,
        wasVoidPlay,
      });

      // Track void suits
      if (wasVoidPlay) {
        if (!this.playerVoids.has(play.playerId)) {
          this.playerVoids.set(play.playerId, new Set());
        }
        this.playerVoids.get(play.playerId)!.add(leadSuit);
      }
    }

    this.currentTrickNumber++;
    this.pruneOldMemories();
  }

  /**
   * Remove memories older than the retention window
   * This implements the recency bias - older cards are "forgotten"
   */
  private pruneOldMemories(): void {
    const cutoffTrick = this.currentTrickNumber - this.memoryTrickCount;
    this.playedCards = this.playedCards.filter(
      (m) => m.trickNumber >= cutoffTrick
    );
    // Note: We don't prune void information - once we know someone is void, we remember
  }

  /**
   * Get all remembered played cards
   */
  getRememberedCards(): PlayedCardMemory[] {
    return [...this.playedCards];
  }

  /**
   * Check if a specific card has been played (and remembered)
   */
  isCardPlayed(card: Card): boolean {
    return this.playedCards.some(
      (m) => m.card.suit === card.suit && m.card.rank === card.rank
    );
  }

  /**
   * Check if a player is void in a suit
   */
  isPlayerVoid(playerId: string, suit: CardSuit): boolean {
    return this.playerVoids.get(playerId)?.has(suit) ?? false;
  }

  /**
   * Get all suits a player is void in
   */
  getPlayerVoids(playerId: string): CardSuit[] {
    const voids = this.playerVoids.get(playerId);
    return voids ? Array.from(voids) : [];
  }

  /**
   * Get high cards of a suit that haven't been played (that we remember)
   * Returns cards of rank >= minRank that we haven't seen played
   */
  getUnseenHighCards(suit: CardSuit, minRank: number = 11): Card[] {
    const allHighCards: Card[] = [];
    for (let rank = minRank; rank <= 14; rank++) {
      allHighCards.push({ suit, rank: rank as Card["rank"] });
    }

    // Filter out cards we've seen played
    return allHighCards.filter((card) => !this.isCardPlayed(card));
  }

  /**
   * Get cards played by a specific player (that we remember)
   */
  getCardsPlayedByPlayer(playerId: string): Card[] {
    return this.playedCards
      .filter((m) => m.playerId === playerId)
      .map((m) => m.card);
  }

  /**
   * Estimate if a player might have high cards of a suit
   * Based on:
   * - They're not void in that suit
   * - We haven't seen them play low cards (might be saving high ones)
   */
  mightHaveHighCards(playerId: string, suit: CardSuit): boolean {
    // If they're void, they definitely don't have high cards
    if (this.isPlayerVoid(playerId, suit)) {
      return false;
    }

    // Check what cards they've played in this suit
    const cardsPlayed = this.playedCards.filter(
      (m) => m.playerId === playerId && m.card.suit === suit
    );

    // If they haven't played any of this suit, they might have high cards
    if (cardsPlayed.length === 0) {
      return true;
    }

    // If they only played low cards, they might be saving high ones
    const highestPlayed = Math.max(...cardsPlayed.map((m) => m.card.rank));
    return highestPlayed < 11; // Haven't shown J or higher
  }

  /**
   * Check if Queen of Spades has been played
   */
  isQueenOfSpadesPlayed(): boolean {
    return this.isCardPlayed({ suit: "spades", rank: 12 });
  }

  /**
   * Get who played the Queen of Spades (if remembered)
   */
  whoPlayedQueenOfSpades(): string | null {
    const queenPlay = this.playedCards.find(
      (m) => m.card.suit === "spades" && m.card.rank === 12
    );
    return queenPlay?.playerId ?? null;
  }

  /**
   * Estimate remaining high cards based on what we've seen
   * Returns count of high cards (J+) in a suit that haven't been played
   */
  countUnseenHighCards(suit: CardSuit): number {
    return this.getUnseenHighCards(suit, 11).length;
  }

  /**
   * Get statistics for debugging/analysis
   */
  getStats(): {
    totalRemembered: number;
    tricksCounted: number;
    playersWithVoids: number;
  } {
    return {
      totalRemembered: this.playedCards.length,
      tricksCounted: this.currentTrickNumber,
      playersWithVoids: this.playerVoids.size,
    };
  }

  /**
   * Get a snapshot of memory for debugging
   */
  getSnapshot(): {
    voidSuits: Record<string, string[]>;
    cardsRememberedCount: number;
    queenPlayed: boolean;
  } {
    const voidSuits: Record<string, string[]> = {};
    for (const [playerId, suits] of this.playerVoids) {
      voidSuits[playerId] = Array.from(suits);
    }

    return {
      voidSuits,
      cardsRememberedCount: this.playedCards.length,
      queenPlayed: this.isQueenOfSpadesPlayed(),
    };
  }
}

