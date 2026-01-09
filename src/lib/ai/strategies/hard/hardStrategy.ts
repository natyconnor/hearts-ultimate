/**
 * Hard AI Strategy - Advanced AI with memory, moon shooting, and strategic play
 */

import type { Card, GameState } from "../../../../types/game";
import type {
  AIStrategy,
  PlayContext,
  PassContext,
  ScoredCard,
  AIConfig,
} from "../../types";
import { AI_VERSION } from "../../types";
import {
  DEFAULT_AI_CONFIG,
  RANK,
  THRESHOLDS,
  PASS_SCORES,
} from "../../constants";
import { scoreCardsForPassing } from "../../utils/cardScoring";
import {
  getSuitDistribution,
  getVoidingPassCandidates,
} from "../../utils/suitAnalysis";
import { CardMemory } from "../../memory/cardMemory";
import { useAIDebugStore } from "../../../../store/aiDebugStore";

import { detectMoonShooter } from "./moonDetection";
import { scoreLeadCards } from "./leadScoring";
import { scoreFollowCards } from "./followScoring";
import { scoreDumpCards } from "./dumpScoring";
import {
  evaluateMoonPotential,
  scoreMoonPassCards,
  type MoonEvaluation,
} from "./moonEvaluation";

export class HardStrategy implements AIStrategy {
  readonly difficulty = "hard" as const;
  private memory: CardMemory;
  private config: AIConfig;
  private playerIndexMap: Map<string, number> = new Map();
  private attemptingMoon = false;
  private moonEvaluation: MoonEvaluation | null = null;
  private _currentPlayerIndex: number | undefined;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.memory = new CardMemory(this.config.memoryTrickCount);
  }

  onRoundStart(): void {
    this.memory.reset();
    this.playerIndexMap.clear();
    this.attemptingMoon = false;
    this.moonEvaluation = null;
  }

  onTrickComplete(
    trick: Array<{ playerId: string; card: Card }>,
    winnerIndex: number,
    _trickNumber: number,
    gameState?: GameState
  ): void {
    if (trick.length === 0) return;

    const leadSuit = trick[0].card.suit;
    const winnerPlayerId = gameState?.players[winnerIndex]?.id;
    this.memory.recordTrick(
      trick,
      this.playerIndexMap,
      leadSuit,
      winnerPlayerId
    );

    if (this.attemptingMoon) {
      this.checkMoonAbort(trick, winnerIndex);
    }
  }

  /** Abort moon attempt if someone else took penalty points */
  private checkMoonAbort(
    trick: Array<{ playerId: string; card: Card }>,
    winnerIndex: number
  ): void {
    const ourPlayerId = Array.from(this.playerIndexMap.entries()).find(
      ([_, idx]) => idx === this._currentPlayerIndex
    )?.[0];

    if (!ourPlayerId) return;

    const ourIndex = this.playerIndexMap.get(ourPlayerId);
    if (ourIndex === undefined) return;

    const hasPenaltyPoints = trick.some((play) => play.card.points > 0);
    if (hasPenaltyPoints && winnerIndex !== ourIndex) {
      this.attemptingMoon = false;
    }
  }

  chooseCardsToPass(context: PassContext): Card[] {
    const { hand, gameState, playerIndex } = context;

    this.updatePlayerIndexMap(gameState);
    this._currentPlayerIndex = playerIndex;

    // Evaluate moon potential
    this.moonEvaluation = evaluateMoonPotential(hand);
    this.attemptingMoon = this.moonEvaluation.shouldAttempt;

    let scoredCards: ScoredCard[];
    let contextInfo: string;

    if (this.attemptingMoon) {
      // Moon attempt: pass LOW cards, keep HIGH cards (opposite of normal!)
      scoredCards = scoreMoonPassCards(hand);
      contextInfo = `MOON ATTEMPT (${this.moonEvaluation.confidence}%) - Passing ${gameState.passDirection}`;
    } else {
      scoredCards = scoreCardsForPassing(hand, true);
      this.applyAdvancedPassScoring(scoredCards, hand, gameState, playerIndex);
      contextInfo = `Passing ${gameState.passDirection}`;
    }

    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCards = scoredCards.slice(0, 3).map((sc) => sc.card);

    this.logPassDecision(
      gameState,
      playerIndex,
      chosenCards,
      scoredCards,
      contextInfo
    );

    return chosenCards;
  }

  chooseCardToPlay(context: PlayContext): Card {
    const {
      validCards,
      isLeading,
      leadSuit,
      isFirstTrick,
      gameState,
      playerIndex,
      tricksPlayedThisRound,
      currentTrickCards,
    } = context;

    this.updatePlayerIndexMap(gameState);
    this._currentPlayerIndex = playerIndex;

    // Must play 2♣ on first trick
    if (isFirstTrick) {
      const twoOfClubs = validCards.find(
        (c) => c.suit === "clubs" && c.rank === 2
      );
      if (twoOfClubs) {
        this.logDecision(
          gameState,
          playerIndex,
          1,
          twoOfClubs,
          [{ card: twoOfClubs, score: 1000, reasons: ["Must play 2♣"] }],
          "First trick mandatory play",
          null,
          this.attemptingMoon
        );
        return twoOfClubs;
      }
    }

    // Detect moon shooter (us or opponent)
    const moonShooterIndex = this.attemptingMoon
      ? playerIndex
      : detectMoonShooter(
          gameState,
          this.config,
          this.memory,
          currentTrickCards
        );

    let scoredCards: ScoredCard[];
    let contextInfo: string;

    if (isLeading) {
      scoredCards = scoreLeadCards(
        context,
        this.memory,
        moonShooterIndex,
        this.attemptingMoon
      );
      contextInfo = this.attemptingMoon ? "Leading (MOON)" : "Leading";
    } else if (leadSuit) {
      const cardsOfSuit = validCards.filter((c) => c.suit === leadSuit);
      if (cardsOfSuit.length > 0) {
        scoredCards = scoreFollowCards(
          cardsOfSuit,
          context,
          this.memory,
          this.config,
          moonShooterIndex,
          this.attemptingMoon
        );
        contextInfo = this.attemptingMoon
          ? `Following ${leadSuit} (MOON)`
          : `Following ${leadSuit}`;
      } else {
        scoredCards = scoreDumpCards(
          validCards,
          context,
          this.memory,
          this.config,
          moonShooterIndex,
          this.attemptingMoon
        );
        contextInfo = this.attemptingMoon
          ? "Dumping (MOON)"
          : "Dumping (Void in suit)";
      }
    } else {
      scoredCards = scoreDumpCards(
        validCards,
        context,
        this.memory,
        this.config,
        moonShooterIndex,
        this.attemptingMoon
      );
      contextInfo = this.attemptingMoon ? "Dumping (MOON)" : "Dumping";
    }

    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCard = scoredCards[0].card;

    this.logDecision(
      gameState,
      playerIndex,
      tricksPlayedThisRound + 1,
      chosenCard,
      scoredCards,
      contextInfo,
      moonShooterIndex,
      this.attemptingMoon
    );

    return chosenCard;
  }

  private updatePlayerIndexMap(gameState: GameState): void {
    for (let i = 0; i < gameState.players.length; i++) {
      this.playerIndexMap.set(gameState.players[i].id, i);
    }
  }

  private logPassDecision(
    gameState: GameState,
    playerIndex: number,
    chosenCards: Card[],
    scoredCards: ScoredCard[],
    contextInfo: string
  ): void {
    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "hard",
      actionType: "pass",
      roundNumber: gameState.roundNumber,
      decision: chosenCards,
      consideredCards: scoredCards,
      contextInfo,
      aiVersion: AI_VERSION,
      memorySnapshot: this.attemptingMoon
        ? {
            cardsTracked: 0,
            tricksCounted: 0,
            voidPlayers: [],
            moonShooterCandidate: gameState.players[playerIndex].name,
            attemptingMoon: true,
            moonConfidence: this.moonEvaluation?.confidence,
            moonReasons: this.moonEvaluation?.reasons,
          }
        : undefined,
    });
  }

  private logDecision(
    gameState: GameState,
    playerIndex: number,
    trickNumber: number,
    chosenCard: Card,
    scoredCards: ScoredCard[],
    contextInfo: string,
    moonShooterIndex: number | null,
    attemptingMoon = false
  ): void {
    const memorySnapshot = this.memory.getSnapshot();
    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "hard",
      actionType: "play",
      roundNumber: gameState.roundNumber,
      trickNumber,
      decision: chosenCard,
      consideredCards: scoredCards,
      contextInfo,
      memorySnapshot: {
        ...memorySnapshot,
        moonShooterCandidate:
          moonShooterIndex !== null
            ? gameState.players[moonShooterIndex].name
            : null,
        attemptingMoon,
        moonConfidence: attemptingMoon
          ? this.moonEvaluation?.confidence
          : undefined,
      },
      aiVersion: AI_VERSION,
    });
  }

  private applyAdvancedPassScoring(
    scoredCards: ScoredCard[],
    hand: Card[],
    gameState: GameState,
    playerIndex: number
  ): void {
    const distribution = getSuitDistribution(hand);
    const voidCandidates = getVoidingPassCandidates(hand);

    for (const scored of scoredCards) {
      const { card } = scored;

      // Boost void candidates (except spades with few low cards)
      if (
        voidCandidates.some((c) => c.suit === card.suit && c.rank === card.rank)
      ) {
        if (
          card.suit !== "spades" ||
          distribution.spades > THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION
        ) {
          scored.score += PASS_SCORES.VOID_OPPORTUNITY;
          scored.reasons?.push("Void opportunity");
        }
      }

      // Protect low spades
      if (card.suit === "spades" && card.rank < RANK.QUEEN) {
        const lowSpades = hand.filter(
          (c) => c.suit === "spades" && c.rank < RANK.QUEEN
        ).length;
        scored.score -=
          PASS_SCORES.SPADE_DEFENSE_MULTIPLIER *
          (THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION -
            Math.min(lowSpades, THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION));
        scored.reasons?.push("Critical spade defense");
      }

      // Well-protected high cards are safer to keep
      if (
        distribution[card.suit] >= THRESHOLDS.PROTECTED_SUIT_SIZE &&
        card.rank >= RANK.HIGH_THRESHOLD
      ) {
        const lowCards = hand.filter(
          (c) => c.suit === card.suit && c.rank < RANK.MID_RANGE_MAX
        ).length;
        if (lowCards >= THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION) {
          scored.score += PASS_SCORES.WELL_PROTECTED_HIGH;
          scored.reasons?.push("Well protected high card");
        }
      }

      // If winning by a lot, dump high cards more aggressively
      const myScore = gameState.scores[playerIndex] ?? 0;
      const minOpponentScore = Math.min(
        ...gameState.scores.filter((_, i) => i !== playerIndex)
      );

      if (myScore < minOpponentScore - THRESHOLDS.WINNING_LEAD_MARGIN) {
        if (card.rank >= RANK.QUEEN) {
          scored.score += PASS_SCORES.PROTECT_LEAD_DUMP_HIGH;
          scored.reasons?.push("Protect lead - dump high cards");
        }
      }
    }
  }
}
