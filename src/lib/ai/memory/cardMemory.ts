/**
 * Card Memory System for Hard AI
 *
 * Implements recency-biased memory that remembers approximately 50% of cards.
 * More recent cards are more likely to be remembered.
 * Tracks:
 * - Which cards have been played
 * - Who played each card
 * - Which players are void in which suits
 * - Behavioral signals for moon shooting detection
 */

import type { Card, CardSuit, CardIdentity } from "../../../types/game";
import type { PlayedCardMemory } from "../types";
import { DEFAULT_AI_CONFIG, RANK } from "../types";
import { isQueenOfSpades, isHeart, isPenaltyCard } from "../../../game/rules";

/**
 * Behavioral signals that suggest moon shooting
 */
export interface MoonBehaviorSignals {
  /** Player voluntarily led with Q♠ (huge red flag!) */
  ledQueenOfSpades: boolean;
  /** Number of high cards (Q+) this player has led with */
  highCardLeads: number;
  /** Number of tricks with hearts this player has won */
  heartsWon: number;
  /** Player had a chance to dump penalty cards but didn't */
  missedDumpOpportunities: number;
  /** Player won a trick when they could have ducked */
  voluntaryWins: number;
}

export class CardMemory {
  private playedCards: PlayedCardMemory[] = [];
  private playerVoids: Map<string, Set<CardSuit>> = new Map();
  private currentTrickNumber: number = 0;
  private memoryTrickCount: number;
  /** Behavioral signals per player ID */
  private moonBehavior: Map<string, MoonBehaviorSignals> = new Map();

  constructor(memoryTrickCount: number = DEFAULT_AI_CONFIG.memoryTrickCount) {
    this.memoryTrickCount = memoryTrickCount;
  }

  /**
   * Reset memory for a new round
   */
  reset(): void {
    this.playedCards = [];
    this.playerVoids.clear();
    this.moonBehavior.clear();
    this.currentTrickNumber = 0;
  }

  /**
   * Get or create behavior signals for a player
   */
  private getBehavior(playerId: string): MoonBehaviorSignals {
    if (!this.moonBehavior.has(playerId)) {
      this.moonBehavior.set(playerId, {
        ledQueenOfSpades: false,
        highCardLeads: 0,
        heartsWon: 0,
        missedDumpOpportunities: 0,
        voluntaryWins: 0,
      });
    }
    return this.moonBehavior.get(playerId)!;
  }

  /**
   * Record a completed trick and analyze behavior
   */
  recordTrick(
    trick: Array<{ playerId: string; card: Card }>,
    playerIndices: Map<string, number>,
    leadSuit: CardSuit,
    winnerPlayerId?: string
  ): void {
    if (trick.length === 0) return;

    const leadPlay = trick[0];
    const leaderId = leadPlay.playerId;

    // Track behavioral signals for the leader
    this.analyzeLead(leaderId, leadPlay.card);

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

        // Track missed dump opportunities (was void but didn't dump penalty cards)
        this.analyzeDumpBehavior(play.playerId, play.card, trick);
      }
    }

    // Track what the winner collected
    if (winnerPlayerId) {
      this.analyzeWin(winnerPlayerId, trick);
    }

    this.currentTrickNumber++;
    this.pruneOldMemories();
  }

  /**
   * Analyze leading behavior for moon signals
   */
  private analyzeLead(playerId: string, card: Card): void {
    const behavior = this.getBehavior(playerId);

    // Leading Q♠ is a HUGE red flag - normally you never want to do this!
    if (isQueenOfSpades(card)) {
      behavior.ledQueenOfSpades = true;
    }

    // Leading high cards (Q, K, A) suggests wanting to win tricks
    if (card.rank >= RANK.QUEEN) {
      behavior.highCardLeads++;
    }
  }

  /**
   * Analyze dump behavior - did player miss chance to dump penalty cards?
   */
  private analyzeDumpBehavior(
    playerId: string,
    cardPlayed: Card,
    _trick: Array<{ playerId: string; card: Card }>
  ): void {
    const behavior = this.getBehavior(playerId);

    // If player was void and played a non-penalty card, they might be
    // deliberately NOT dumping (suspicious if they have penalty cards)
    // This is a weak signal - we can't know what they had in hand
    if (!isPenaltyCard(cardPlayed)) {
      // Could have dumped but didn't - slight suspicion
      // Only count if it's a low card (not trying to win either)
      if (cardPlayed.rank <= 8) {
        behavior.missedDumpOpportunities++;
      }
    }
  }

  /**
   * Analyze what the winner collected
   */
  private analyzeWin(
    winnerId: string,
    trick: Array<{ playerId: string; card: Card }>
  ): void {
    const behavior = this.getBehavior(winnerId);

    // Count hearts won
    const heartsInTrick = trick.filter((p) => isHeart(p.card)).length;
    if (heartsInTrick > 0) {
      behavior.heartsWon += heartsInTrick;
    }

    // Check if this was a "voluntary" win (they played highest in suit)
    // We can detect this by checking if they led or played the highest
    const winnerPlay = trick.find((p) => p.playerId === winnerId);
    const leadSuit = trick[0].card.suit;

    if (winnerPlay && winnerPlay.card.suit === leadSuit) {
      const suitPlays = trick.filter((p) => p.card.suit === leadSuit);
      const highestRank = Math.max(...suitPlays.map((p) => p.card.rank));

      // They played the highest card - potentially voluntary
      if (winnerPlay.card.rank === highestRank && suitPlays.length > 1) {
        // Check if there were penalty points in the trick
        const hasPenalty = trick.some((p) => isPenaltyCard(p.card));
        if (hasPenalty) {
          behavior.voluntaryWins++;
        }
      }
    }
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
   * Only needs suit and rank to identify the card
   */
  isCardPlayed(card: CardIdentity): boolean {
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
   * Returns card identities of rank >= minRank that we haven't seen played
   */
  getUnseenHighCards(suit: CardSuit, minRank: number = 11): CardIdentity[] {
    const allHighCards: CardIdentity[] = [];
    for (let rank = minRank; rank <= 14; rank++) {
      allHighCards.push({ suit, rank: rank as CardIdentity["rank"] });
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
   * Get moon behavior signals for a player
   */
  getMoonBehavior(playerId: string): MoonBehaviorSignals {
    return this.getBehavior(playerId);
  }

  /**
   * Get all players with suspicious moon behavior
   * Returns player IDs sorted by suspicion level (most suspicious first)
   */
  getSuspiciousMoonPlayers(): Array<{
    playerId: string;
    suspicionScore: number;
    signals: MoonBehaviorSignals;
  }> {
    const results: Array<{
      playerId: string;
      suspicionScore: number;
      signals: MoonBehaviorSignals;
    }> = [];

    for (const [playerId, signals] of this.moonBehavior) {
      let score = 0;

      // Leading Q♠ is a MASSIVE red flag (50 points)
      if (signals.ledQueenOfSpades) {
        score += 50;
      }

      // High card leads suggest wanting to win (5 points each)
      score += signals.highCardLeads * 5;

      // Hearts won (3 points per heart)
      score += signals.heartsWon * 3;

      // Voluntary penalty wins (10 points each)
      score += signals.voluntaryWins * 10;

      // Missed dump opportunities (weak signal, 2 points)
      score += signals.missedDumpOpportunities * 2;

      if (score > 0) {
        results.push({ playerId, suspicionScore: score, signals });
      }
    }

    return results.sort((a, b) => b.suspicionScore - a.suspicionScore);
  }

  /**
   * Get a snapshot of memory for debugging
   */
  getSnapshot(): {
    voidSuits: Record<string, string[]>;
    cardsRememberedCount: number;
    queenPlayed: boolean;
    moonSuspects: Array<{ playerId: string; score: number }>;
  } {
    const voidSuits: Record<string, string[]> = {};
    for (const [playerId, suits] of this.playerVoids) {
      voidSuits[playerId] = Array.from(suits);
    }

    const moonSuspects = this.getSuspiciousMoonPlayers().map((s) => ({
      playerId: s.playerId,
      score: s.suspicionScore,
    }));

    return {
      voidSuits,
      cardsRememberedCount: this.playedCards.length,
      queenPlayed: this.isQueenOfSpadesPlayed(),
      moonSuspects,
    };
  }
}
