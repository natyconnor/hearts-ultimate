/**
 * Hard AI Strategy
 *
 * Advanced AI with all Medium features PLUS:
 * - Imperfect card counting with recency-biased memory
 * - Bluffing (taking safe early tricks to disguise hand)
 * - Moon shooting detection and prevention
 * - PROACTIVE moon shooting attempts when hand is strong
 * - Leader targeting (give points to winning player)
 * - Advanced suit voiding strategy
 */

import type { Card, GameState } from "../../../../types/game";
import type {
  AIStrategy,
  PlayContext,
  PassContext,
  ScoredCard,
  AIConfig,
} from "../../types";
import {
  DEFAULT_AI_CONFIG,
  RANK,
  THRESHOLDS,
  PASS_SCORES,
  AI_VERSION,
} from "../../types";
import { scoreCardsForPassing } from "../../utils/cardScoring";
import {
  getSuitDistribution,
  getVoidingPassCandidates,
} from "../../utils/suitAnalysis";
import { CardMemory } from "../../memory/cardMemory";
import { useAIDebugStore } from "../../../../store/aiDebugStore";

// Import scoring modules
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

  // Moon shooting state
  private attemptingMoon: boolean = false;
  private moonEvaluation: MoonEvaluation | null = null;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.memory = new CardMemory(this.config.memoryTrickCount);
  }

  /**
   * Called when a new round starts
   */
  onRoundStart(): void {
    this.memory.reset();
    this.playerIndexMap.clear();
    this.attemptingMoon = false;
    this.moonEvaluation = null;
  }

  /**
   * Called when a trick completes - update memory and check moon abort
   */
  onTrickComplete(
    trick: Array<{ playerId: string; card: Card }>,
    winnerIndex: number,
    _trickNumber: number,
    gameState?: GameState
  ): void {
    if (trick.length === 0) return;

    const leadSuit = trick[0].card.suit;
    // Get the winner's player ID for behavior tracking
    const winnerPlayerId = gameState?.players[winnerIndex]?.id;
    this.memory.recordTrick(
      trick,
      this.playerIndexMap,
      leadSuit,
      winnerPlayerId
    );

    // Check if we need to abort moon attempt
    if (this.attemptingMoon) {
      this.checkMoonAbort(trick, winnerIndex);
    }
  }

  /**
   * Check if moon attempt should be aborted
   * Abort if someone else took penalty points
   */
  private checkMoonAbort(
    trick: Array<{ playerId: string; card: Card }>,
    winnerIndex: number
  ): void {
    // Get our player index
    const ourPlayerId = Array.from(this.playerIndexMap.entries()).find(
      ([_, idx]) => idx === this.getOurPlayerIndex()
    )?.[0];

    if (!ourPlayerId) return;

    const ourIndex = this.playerIndexMap.get(ourPlayerId);
    if (ourIndex === undefined) return;

    // Check if the trick had penalty points
    const hasPenaltyPoints = trick.some((play) => play.card.points > 0);

    // If trick had points and we didn't win it, abort moon
    if (hasPenaltyPoints && winnerIndex !== ourIndex) {
      this.attemptingMoon = false;
      // Could log this for debugging
    }
  }

  /**
   * Get our player index (the AI using this strategy instance)
   */
  private getOurPlayerIndex(): number | undefined {
    // This will be set during play/pass calls
    return this._currentPlayerIndex;
  }

  private _currentPlayerIndex: number | undefined;

  /**
   * Choose 3 cards to pass
   */
  chooseCardsToPass(context: PassContext): Card[] {
    const { hand, gameState, playerIndex } = context;

    // Update player index map and current player
    this.updatePlayerIndexMap(gameState);
    this._currentPlayerIndex = playerIndex;

    // Evaluate if we should attempt to shoot the moon
    this.moonEvaluation = evaluateMoonPotential(hand);
    this.attemptingMoon = this.moonEvaluation.shouldAttempt;

    let scoredCards: ScoredCard[];
    let contextInfo: string;

    if (this.attemptingMoon) {
      // Moon attempt: pass LOW cards, keep HIGH cards (opposite of normal!)
      scoredCards = scoreMoonPassCards(hand);
      contextInfo = `MOON ATTEMPT (${this.moonEvaluation.confidence}%) - Passing ${gameState.passDirection}`;
    } else {
      // Normal passing
      scoredCards = scoreCardsForPassing(hand, true);
      this.applyAdvancedPassScoring(scoredCards, hand, gameState, playerIndex);
      contextInfo = `Passing ${gameState.passDirection}`;
    }

    // Sort and return top 3
    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCards = scoredCards.slice(0, 3).map((sc) => sc.card);

    // Log decision with moon evaluation info
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
            moonConfidence: this.moonEvaluation.confidence,
            moonReasons: this.moonEvaluation.reasons,
          }
        : undefined,
    });

    return chosenCards;
  }

  /**
   * Choose a card to play
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
      currentTrickCards,
    } = context;

    // Update player map and current player
    this.updatePlayerIndexMap(gameState);
    this._currentPlayerIndex = playerIndex;

    // First trick - must play 2 of clubs if we have it
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

    // Check for moon shooter - if WE are attempting, we're the shooter
    // Otherwise detect if someone else is (include current trick for real-time detection)
    let moonShooterIndex: number | null;
    if (this.attemptingMoon) {
      moonShooterIndex = playerIndex; // We're the shooter!
    } else {
      moonShooterIndex = detectMoonShooter(
        gameState,
        this.config,
        this.memory,
        currentTrickCards
      );
    }

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

    // Select best card
    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCard = scoredCards[0].card;

    // Log decision
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

  /**
   * Update the player index map from game state
   */
  private updatePlayerIndexMap(gameState: GameState): void {
    for (let i = 0; i < gameState.players.length; i++) {
      this.playerIndexMap.set(gameState.players[i].id, i);
    }
  }

  /**
   * Log a decision for debugging
   */
  private logDecision(
    gameState: GameState,
    playerIndex: number,
    trickNumber: number,
    chosenCard: Card,
    scoredCards: ScoredCard[],
    contextInfo: string,
    moonShooterIndex: number | null,
    attemptingMoon: boolean = false
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

  /**
   * Apply advanced scoring adjustments for passing
   */
  private applyAdvancedPassScoring(
    scoredCards: ScoredCard[],
    hand: Card[],
    gameState: GameState,
    playerIndex: number
  ): void {
    const distribution = getSuitDistribution(hand);

    // Find best voiding opportunities (already filtered to exclude low cards)
    const voidCandidates = getVoidingPassCandidates(hand);

    for (const scored of scoredCards) {
      const { card } = scored;

      // Boost void candidates (except spades with few low cards)
      // Note: voidCandidates already excludes low cards (rank < 6)
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

      // Very protective of low spades
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

      // If we have 4+ cards in a suit with good low cards, high cards are safer
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

      // Consider game score - if we're winning, be more conservative
      const myScore = gameState.scores[playerIndex] ?? 0;
      const minOpponentScore = Math.min(
        ...gameState.scores.filter((_, i) => i !== playerIndex)
      );

      if (myScore < minOpponentScore - THRESHOLDS.WINNING_LEAD_MARGIN) {
        // We're winning by a lot - be more aggressive about getting rid of high cards
        if (card.rank >= RANK.QUEEN) {
          scored.score += PASS_SCORES.PROTECT_LEAD_DUMP_HIGH;
          scored.reasons?.push("Protect lead - dump high cards");
        }
      }
    }
  }
}
