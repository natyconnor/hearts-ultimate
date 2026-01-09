/**
 * AI-related type definitions for Hearts game
 */

import type { Card, CardSuit, GameState, AIDifficulty } from "../../types/game";

// Re-export AIDifficulty for convenience
export type { AIDifficulty } from "../../types/game";

/**
 * AI Version Number
 *
 * Increment this number whenever AI behavior changes.
 * This helps track which version of the AI generated logs for debugging and analysis.
 *
 * Version history:
 * - 1: Initial implementation
 * - 2: Fixed Hard AI bugs:
 *      - Fixed isFirstTrick() to check max hand size, not all hands equal 13
 *        (was broken for players 2-4 on trick 1 after player 1 played)
 *      - Fixed memory logic: "opponent has high cards" is now a bonus when
 *        leading low cards (they take the trick), not a penalty
 *      - Smarter heart leading: low hearts (2-5) are good leads, high hearts risky
 *      - Cleaner first-trick handling in follow logic
 * - 3: Fixed critical bug where Hard AI memory was never being updated!
 *      - Added notifyTrickComplete() calls when tricks complete
 *      - Added resetAIForNewRound() calls at round start
 *      - Now currentTrickNumber is explicitly tracked in GameState
 * - 4: Fixed bug where AI didn't check if Q♠ is in the CURRENT trick
 *      - When following spades and Q♠ is already played in trick, high spades are safe
 *      - Added isQueenOfSpadesAccountedFor() helper that checks both current trick and memory
 * - 5: Fixed overly aggressive voiding during passing phase
 *      - Low cards (rank < 6) now have strong penalty against being passed (-35)
 *      - Void opportunity bonus only applies to cards rank 6+
 *      - getVoidingPassCandidates() now filters out low cards
 *      - Low cards (2-5) are extremely valuable for ducking and should almost never be passed
 * - 6: Added PROACTIVE moon shooting for Hard AI
 *      - evaluateMoonPotential() evaluates hand strength for shooting
 *      - Criteria: A♥ (critical), Q♠ control, high cards across suits, suit length
 *      - When shooting: pass LOW cards, keep HIGH cards (opposite of normal!)
 *      - Play scoring inverted: try to WIN tricks and collect penalty points
 *      - Moon abort detection: stops if opponent takes penalty points
 *      - Shown in debug logs with "MOON" context and confidence %
 */
export const AI_VERSION = 6;

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
    trickNumber: number,
    gameState?: GameState
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
  /** Moon shooting: tricks <= this are "early game" (sneaky phase) */
  MOON_EARLY_GAME_TRICKS: 5,
  /** Moon shooting: tricks <= this are "mid game" (collection phase) */
  MOON_MID_GAME_TRICKS: 9,
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
  /** Score penalty for passing low cards (rank < 6) - these are valuable for ducking */
  LOW_CARD_PROTECTION: -35,
  /** Threshold rank below which cards are considered "low" and valuable to keep */
  LOW_CARD_THRESHOLD: 6,
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
  /** Penalty for hearts not broken (can't lead) */
  HEARTS_NOT_BROKEN: -100,
  /** Bonus for low heart when opponents are void */
  LOW_HEART_VOID_OPPONENTS: 10,
  /** Penalty for higher hearts with void opponents */
  HIGH_HEART_VOID_RISK: -20,
  /** Bonus for low heart lead (no void opponents) */
  LOW_HEART_LEAD: 15,
  /** Penalty for high hearts (might win) */
  HIGH_HEART_RISK: -15,
  /** Penalty for mid-range hearts */
  MID_HEART: -5,
  /** Penalty for never leading Q♠ */
  NEVER_LEAD_QUEEN: -200,
  /** Penalty for saving spade to protect Q♠ */
  SAVE_SPADE_FOR_QUEEN: -20,
  /** Penalty for high spade might catch Q♠ */
  HIGH_SPADE_CATCH_QUEEN: -25,
  /** Multiplier for opponents void in suit */
  OPPONENT_VOID_MULTIPLIER: -15,
  /** Multiplier for opponents with high cards (bonus) */
  OPPONENT_HIGH_CARDS_MULTIPLIER: 10,
  /** Bonus for safe low lead (clubs/diamonds) */
  SAFE_LOW_LEAD: 15,
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
  /** Multiplier for penalty points (negative = more points is worse) */
  PENALTY_POINTS_MULTIPLIER: -5,
  /** Score for safe win as last player */
  SAFE_WIN_LAST_PLAYER: 10,
  /** Score penalty for risk of penalty dump */
  RISK_OF_DUMP: -15,
  /** Score for ducking */
  DUCK: 25,
  /** Score for moon shot - take penalties */
  MOON_SHOT_TAKE: 50,
  /** Score for stopping moon - MUST be higher than DUCK to override ducking! */
  STOP_MOON: 150,
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
  /** Penalty for giving Q♠ to moon shooter - MUST override QUEEN_OF_SPADES bonus! */
  DONT_GIVE_QUEEN_TO_SHOOTER: -350,
  /** Penalty for giving hearts to moon shooter - MUST override HEART dump bonus! */
  DONT_GIVE_HEARTS_TO_SHOOTER: -200,
  /** Score for dumping on non-shooter (actively try to stop moon) */
  DUMP_ON_NON_SHOOTER: 250,
  /** Hard AI keep spade when Q♠ still out */
  HARD_KEEP_SPADE_QUEEN_OUT: -30,
  /** Hard AI keep low spade */
  HARD_KEEP_LOW_SPADE: -10,
} as const;
