/**
 * AI-related type definitions for Hearts game
 */

import type { Card, CardSuit, GameState, AIDifficulty } from "../../types/game";

// Re-export AIDifficulty for convenience
export type { AIDifficulty } from "../../types/game";

/**
 * Context for making AI decisions during play
 */
export interface PlayContext {
  gameState: GameState;
  playerIndex: number;
  validCards: Card[];
  isLeading: boolean;
  leadSuit: CardSuit | null;
  currentTrickCards: Array<{ playerId: string; card: Card }>;
  tricksPlayedThisRound: number;
  isFirstTrick: boolean;
}

/**
 * Context for making AI decisions during passing
 */
export interface PassContext {
  hand: Card[];
  passDirection: "left" | "right" | "across";
  gameState: GameState;
  playerIndex: number;
}

/**
 * Recorded memory of a played card
 */
export interface PlayedCardMemory {
  card: Card;
  playerId: string;
  playerIndex: number;
  trickNumber: number; // Which trick this was played in (0-12)
  wasVoidPlay: boolean; // True if player couldn't follow suit
}

/**
 * Memory of void suits for each player
 */
export interface PlayerVoidMemory {
  playerId: string;
  playerIndex: number;
  voidSuits: Set<CardSuit>;
}

/**
 * Result of analyzing whether AI will win the current trick
 */
export interface TrickWinAnalysis {
  willWin: boolean;
  currentWinningCard: Card | null;
  currentWinningPlayerIndex: number | null;
  penaltyPointsInTrick: number;
  hasQueenOfSpades: boolean;
}

/**
 * Result of analyzing suit distribution
 */
export interface SuitDistribution {
  clubs: number;
  diamonds: number;
  spades: number;
  hearts: number;
}

/**
 * Card with an associated score for decision making
 */
export interface ScoredCard {
  card: Card;
  score: number;
  reasons?: string[]; // Debug info about why this score
}

/**
 * Interface for AI strategy implementations
 */
export interface AIStrategy {
  readonly difficulty: AIDifficulty;

  /**
   * Choose 3 cards to pass during the passing phase
   */
  chooseCardsToPass(context: PassContext): Card[];

  /**
   * Choose a card to play during the playing phase
   */
  chooseCardToPlay(context: PlayContext): Card;

  /**
   * Called when a trick completes (for Hard AI to update memory)
   */
  onTrickComplete?(
    trick: Array<{ playerId: string; card: Card }>,
    winnerIndex: number,
    trickNumber: number
  ): void;

  /**
   * Called when a new round starts (for Hard AI to reset memory)
   */
  onRoundStart?(): void;
}

/**
 * Configuration for AI behavior tuning
 */
export interface AIConfig {
  // Bluffing probability (0-1) for Hard AI
  bluffProbability: number;

  // Memory retention - how many recent tricks to remember (for Hard AI)
  memoryTrickCount: number;

  // Score thresholds for moon detection
  moonDetectionThreshold: number;

  // Point difference to consider someone "in the lead"
  leaderPointThreshold: number;
}

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  bluffProbability: 0.15, // 15% chance to bluff on safe tricks
  memoryTrickCount: 7, // Remember last 7 tricks (~54% of cards)
  moonDetectionThreshold: 20, // Start worrying about moon at 20+ points
  leaderPointThreshold: 15, // Consider someone leading if 15+ points behind
};

// ============================================================================
// AI Scoring Constants
// ============================================================================
// These constants define the scoring weights used by AI strategies.
// Higher positive scores = more desirable to play/pass
// Negative scores = less desirable to play/pass

/**
 * Card rank thresholds
 */
export const RANK = {
  /** Jack rank value */
  JACK: 11,
  /** Queen rank value */
  QUEEN: 12,
  /** King rank value */
  KING: 13,
  /** Ace rank value */
  ACE: 14,
  /** Low card threshold (cards at or below are considered "low") */
  LOW_THRESHOLD: 4,
  /** Mid-range card minimum */
  MID_RANGE_MIN: 7,
  /** Mid-range card maximum */
  MID_RANGE_MAX: 10,
  /** High card threshold (cards at or above are considered "high") */
  HIGH_THRESHOLD: 11,
  /** Bluff range minimum */
  BLUFF_MIN: 9,
} as const;

/**
 * Game phase thresholds
 */
export const THRESHOLDS = {
  /** Tricks played before considered "late game" (no bluffing) */
  LATE_GAME_TRICKS: 8,
  /** Tricks played before considered "early game" */
  EARLY_GAME_TRICKS: 4,
  /** Minimum cards in suit to be considered "well protected" */
  PROTECTED_SUIT_SIZE: 4,
  /** Minimum low cards needed for protection */
  MIN_LOW_CARDS_FOR_PROTECTION: 3,
  /** Maximum low spades before considered "critical" */
  CRITICAL_LOW_SPADE_COUNT: 2,
  /** Hearts count to suspect moon shooting (with Q♠) */
  MOON_HEARTS_WITH_QUEEN: 6,
  /** Hearts count to suspect moon shooting (without Q♠) */
  MOON_HEARTS_WITHOUT_QUEEN: 10,
  /** Score lead to be considered "winning by a lot" */
  WINNING_LEAD_MARGIN: 20,
} as const;

/**
 * Passing phase scoring weights
 */
export const PASS_SCORES = {
  /** Score for passing Q♠ without protection */
  QUEEN_OF_SPADES_UNPROTECTED: 100,
  /** Score for passing Q♠ with some protection */
  QUEEN_OF_SPADES_PROTECTED: 30,
  /** Base score for passing hearts */
  HEART_BASE: 20,
  /** Score reduction for protected high cards */
  PROTECTED_HIGH_CARD: -20,
  /** Score reduction for critical spade defense */
  CRITICAL_SPADE_DEFENSE: -30,
  /** Score for void opportunity */
  VOID_OPPORTUNITY: 25,
  /** Score for well-protected high card */
  WELL_PROTECTED_HIGH: -30,
  /** Score for protecting lead by dumping high cards */
  PROTECT_LEAD_DUMP_HIGH: 10,
  /** Multiplier for spade defense based on low spade count */
  SPADE_DEFENSE_MULTIPLIER: 15,
  /** Score for high spades without Q♠ */
  HIGH_SPADE_NO_QUEEN: 15,
} as const;

/**
 * Leading phase scoring weights
 */
export const LEAD_SCORES = {
  /** Base score for leading */
  BASE: 100,
  /** Multiplier for rank penalty when leading */
  RANK_PENALTY_MULTIPLIER: 3,
  /** Score for strategic low heart lead */
  STRATEGIC_LOW_HEART: 20,
  /** Score penalty for leading hearts */
  AVOID_HEARTS: -30,
  /** Score for fishing for Q♠ */
  FISH_FOR_QUEEN: 15,
  /** Score penalty for preserving Q♠ protection */
  PRESERVE_QUEEN_PROTECTION: -20,
  /** Score penalty for high spades */
  AVOID_HIGH_SPADES: -25,
  /** Score for early safe lead */
  EARLY_SAFE_LEAD: 10,
  /** Score for lowest card in suit */
  LOWEST_IN_SUIT: 15,
  /** Score for bluff lead */
  BLUFF_LEAD: 20,
  /** Score for moon prevention lead */
  MOON_PREVENTION: 10,
  /** Score for targeting leader with hearts */
  TARGET_LEADER_HEARTS: 15,
  /** Score penalty when opponent void in hearts */
  OPPONENT_VOID_HEARTS: -50,
  /** Score for safe lowest remaining heart */
  SAFE_LOWEST_HEART: 25,
  /** Hard AI fish for Q♠ bonus */
  HARD_FISH_FOR_QUEEN: 20,
  /** Hard AI protect owned Q♠ */
  HARD_PROTECT_OWNED_QUEEN: -30,
  /** Penalty for opponent might have high cards */
  OPPONENT_MIGHT_HAVE_HIGH: -5,
  /** Penalty for opponent void in suit */
  OPPONENT_VOID_IN_SUIT: -15,
  /** Penalty for leading into moon shooter void */
  MOON_SHOOTER_VOID: -20,
} as const;

/**
 * Following phase scoring weights
 */
export const FOLLOW_SCORES = {
  /** Base score for following */
  BASE: 100,
  /** Score for safe win on first trick */
  TRICK_1_SAFE_WIN: 20,
  /** Multiplier for rank when winning trick 1 */
  TRICK_1_RANK_MULTIPLIER: 2,
  /** Base penalty for winning with points */
  WIN_WITH_POINTS_BASE: -40,
  /** Multiplier for penalty points */
  PENALTY_POINTS_MULTIPLIER: 5,
  /** Score for safe win as last player */
  SAFE_WIN_LAST_PLAYER: 10,
  /** Score penalty for risk of penalty dump */
  RISK_OF_DUMP: -15,
  /** Score for ducking */
  DUCK: 25,
  /** Score for moon shot - take penalties */
  MOON_SHOT_TAKE: 50,
  /** Score for stopping moon */
  STOP_MOON: 30,
  /** Score for safe win */
  SAFE_WIN: 20,
  /** Score for bluff - take safe trick */
  BLUFF_TAKE_SAFE: 15,
} as const;

/**
 * Dumping phase scoring weights
 */
export const DUMP_SCORES = {
  /** Base score for dumping */
  BASE: 100,
  /** Score for dumping Q♠ */
  QUEEN_OF_SPADES: 200,
  /** Base score for dumping hearts */
  HEART_BASE: 50,
  /** Multiplier for heart rank when dumping */
  HEART_RANK_MULTIPLIER: 3,
  /** Multiplier for high card rank when dumping */
  HIGH_CARD_RANK_MULTIPLIER: 2,
  /** Score penalty for keeping low spade */
  KEEP_LOW_SPADE: -25,
  /** Score for dumping on leader */
  DUMP_ON_LEADER: 30,
  /** Penalty for giving Q♠ to moon shooter */
  DONT_GIVE_QUEEN_TO_SHOOTER: -100,
  /** Penalty for giving hearts to moon shooter */
  DONT_GIVE_HEARTS_TO_SHOOTER: -50,
  /** Score for dumping on non-shooter */
  DUMP_ON_NON_SHOOTER: 200,
  /** Hard AI keep spade when Q♠ still out */
  HARD_KEEP_SPADE_QUEEN_OUT: -30,
  /** Hard AI keep low spade */
  HARD_KEEP_LOW_SPADE: -10,
} as const;
