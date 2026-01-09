/**
 * Card Memory System
 *
 * Recency-biased memory (~50% retention) tracking:
 * - Cards played and by whom
 * - Player void suits
 * - Behavioral signals for moon detection
 */

import type { Card, CardSuit, CardIdentity } from "../../../types/game";
import type { PlayedCardMemory } from "../types";
import { DEFAULT_AI_CONFIG, RANK } from "../constants";
import { isQueenOfSpades, isHeart, isPenaltyCard } from "../../../game/rules";

export interface MoonBehaviorSignals {
  ledQueenOfSpades: boolean;
  highCardLeads: number;
  heartsWon: number;
  missedDumpOpportunities: number;
  voluntaryWins: number;
}

export class CardMemory {
  private playedCards: PlayedCardMemory[] = [];
  private playerVoids: Map<string, Set<CardSuit>> = new Map();
  private currentTrickNumber = 0;
  private memoryTrickCount: number;
  private moonBehavior: Map<string, MoonBehaviorSignals> = new Map();

  constructor(memoryTrickCount: number = DEFAULT_AI_CONFIG.memoryTrickCount) {
    this.memoryTrickCount = memoryTrickCount;
  }

  reset(): void {
    this.playedCards = [];
    this.playerVoids.clear();
    this.moonBehavior.clear();
    this.currentTrickNumber = 0;
  }

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

  recordTrick(
    trick: Array<{ playerId: string; card: Card }>,
    playerIndices: Map<string, number>,
    leadSuit: CardSuit,
    winnerPlayerId?: string
  ): void {
    if (trick.length === 0) return;

    const leadPlay = trick[0];
    this.analyzeLead(leadPlay.playerId, leadPlay.card);

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

      if (wasVoidPlay) {
        if (!this.playerVoids.has(play.playerId)) {
          this.playerVoids.set(play.playerId, new Set());
        }
        this.playerVoids.get(play.playerId)!.add(leadSuit);
        this.analyzeDumpBehavior(play.playerId, play.card);
      }
    }

    if (winnerPlayerId) {
      this.analyzeWin(winnerPlayerId, trick);
    }

    this.currentTrickNumber++;
    this.pruneOldMemories();
  }

  private analyzeLead(playerId: string, card: Card): void {
    const behavior = this.getBehavior(playerId);

    if (isQueenOfSpades(card)) {
      behavior.ledQueenOfSpades = true;
    }

    if (card.rank >= RANK.QUEEN) {
      behavior.highCardLeads++;
    }
  }

  private analyzeDumpBehavior(playerId: string, cardPlayed: Card): void {
    const behavior = this.getBehavior(playerId);

    // Void play with low non-penalty card - might be holding penalties
    if (!isPenaltyCard(cardPlayed) && cardPlayed.rank <= 8) {
      behavior.missedDumpOpportunities++;
    }
  }

  private analyzeWin(
    winnerId: string,
    trick: Array<{ playerId: string; card: Card }>
  ): void {
    const behavior = this.getBehavior(winnerId);

    const heartsInTrick = trick.filter((p) => isHeart(p.card)).length;
    if (heartsInTrick > 0) {
      behavior.heartsWon += heartsInTrick;
    }

    // Check if voluntary win with penalties
    const winnerPlay = trick.find((p) => p.playerId === winnerId);
    const leadSuit = trick[0].card.suit;

    if (winnerPlay && winnerPlay.card.suit === leadSuit) {
      const suitPlays = trick.filter((p) => p.card.suit === leadSuit);
      const highestRank = Math.max(...suitPlays.map((p) => p.card.rank));

      if (winnerPlay.card.rank === highestRank && suitPlays.length > 1) {
        const hasPenalty = trick.some((p) => isPenaltyCard(p.card));
        if (hasPenalty) {
          behavior.voluntaryWins++;
        }
      }
    }
  }

  private pruneOldMemories(): void {
    const cutoffTrick = this.currentTrickNumber - this.memoryTrickCount;
    this.playedCards = this.playedCards.filter(
      (m) => m.trickNumber >= cutoffTrick
    );
  }

  getRememberedCards(): PlayedCardMemory[] {
    return [...this.playedCards];
  }

  isCardPlayed(card: CardIdentity): boolean {
    return this.playedCards.some(
      (m) => m.card.suit === card.suit && m.card.rank === card.rank
    );
  }

  isPlayerVoid(playerId: string, suit: CardSuit): boolean {
    return this.playerVoids.get(playerId)?.has(suit) ?? false;
  }

  getPlayerVoids(playerId: string): CardSuit[] {
    const voids = this.playerVoids.get(playerId);
    return voids ? Array.from(voids) : [];
  }

  getUnseenHighCards(suit: CardSuit, minRank = 11): CardIdentity[] {
    const allHighCards: CardIdentity[] = [];
    for (let rank = minRank; rank <= 14; rank++) {
      allHighCards.push({ suit, rank: rank as CardIdentity["rank"] });
    }
    return allHighCards.filter((card) => !this.isCardPlayed(card));
  }

  getCardsPlayedByPlayer(playerId: string): Card[] {
    return this.playedCards
      .filter((m) => m.playerId === playerId)
      .map((m) => m.card);
  }

  mightHaveHighCards(playerId: string, suit: CardSuit): boolean {
    if (this.isPlayerVoid(playerId, suit)) return false;

    const cardsPlayed = this.playedCards.filter(
      (m) => m.playerId === playerId && m.card.suit === suit
    );

    if (cardsPlayed.length === 0) return true;

    const highestPlayed = Math.max(...cardsPlayed.map((m) => m.card.rank));
    return highestPlayed < 11;
  }

  isQueenOfSpadesPlayed(): boolean {
    return this.isCardPlayed({ suit: "spades", rank: 12 });
  }

  whoPlayedQueenOfSpades(): string | null {
    const queenPlay = this.playedCards.find(
      (m) => m.card.suit === "spades" && m.card.rank === 12
    );
    return queenPlay?.playerId ?? null;
  }

  countUnseenHighCards(suit: CardSuit): number {
    return this.getUnseenHighCards(suit, 11).length;
  }

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

  getMoonBehavior(playerId: string): MoonBehaviorSignals {
    return this.getBehavior(playerId);
  }

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

      if (signals.ledQueenOfSpades) score += 50;
      score += signals.highCardLeads * 5;
      score += signals.heartsWon * 3;
      score += signals.voluntaryWins * 10;
      score += signals.missedDumpOpportunities * 2;

      if (score > 0) {
        results.push({ playerId, suspicionScore: score, signals });
      }
    }

    return results.sort((a, b) => b.suspicionScore - a.suspicionScore);
  }

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

    return {
      voidSuits,
      cardsRememberedCount: this.playedCards.length,
      queenPlayed: this.isQueenOfSpadesPlayed(),
      moonSuspects: this.getSuspiciousMoonPlayers().map((s) => ({
        playerId: s.playerId,
        score: s.suspicionScore,
      })),
    };
  }
}
