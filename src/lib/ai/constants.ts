/**
 * AI Scoring Constants
 *
 * All scoring weights used by AI strategies.
 * Higher positive = more desirable, negative = less desirable.
 */

/** Card rank values and thresholds */
export const RANK = {
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14,
  LOW_THRESHOLD: 4,
  MID_RANGE_MIN: 7,
  MID_RANGE_MAX: 10,
  HIGH_THRESHOLD: 11,
  BLUFF_MIN: 9,
} as const;

/** Game phase thresholds */
export const THRESHOLDS = {
  LATE_GAME_TRICKS: 8,
  EARLY_GAME_TRICKS: 4,
  PROTECTED_SUIT_SIZE: 4,
  MIN_LOW_CARDS_FOR_PROTECTION: 3,
  CRITICAL_LOW_SPADE_COUNT: 2,
  MOON_HEARTS_WITH_QUEEN: 6,
  MOON_HEARTS_WITHOUT_QUEEN: 10,
  WINNING_LEAD_MARGIN: 20,
  MOON_EARLY_GAME_TRICKS: 5,
  MOON_MID_GAME_TRICKS: 9,
} as const;

/** Passing phase scoring */
export const PASS_SCORES = {
  QUEEN_OF_SPADES_UNPROTECTED: 100,
  QUEEN_OF_SPADES_PROTECTED: 30,
  HEART_BASE: 20,
  PROTECTED_HIGH_CARD: -20,
  CRITICAL_SPADE_DEFENSE: -30,
  VOID_OPPORTUNITY: 25,
  WELL_PROTECTED_HIGH: -30,
  PROTECT_LEAD_DUMP_HIGH: 10,
  SPADE_DEFENSE_MULTIPLIER: 15,
  HIGH_SPADE_NO_QUEEN: 15,
  LOW_CARD_PROTECTION: -35,
  LOW_CARD_THRESHOLD: 6,
} as const;

/** Leading phase scoring */
export const LEAD_SCORES = {
  BASE: 100,
  RANK_PENALTY_MULTIPLIER: 3,
  STRATEGIC_LOW_HEART: 20,
  AVOID_HEARTS: -30,
  FISH_FOR_QUEEN: 15,
  PRESERVE_QUEEN_PROTECTION: -20,
  AVOID_HIGH_SPADES: -25,
  EARLY_SAFE_LEAD: 10,
  LOWEST_IN_SUIT: 15,
  BLUFF_LEAD: 20,
  MOON_PREVENTION: 10,
  TARGET_LEADER_HEARTS: 15,
  OPPONENT_VOID_HEARTS: -50,
  SAFE_LOWEST_HEART: 25,
  HARD_FISH_FOR_QUEEN: 20,
  HARD_PROTECT_OWNED_QUEEN: -30,
  OPPONENT_MIGHT_HAVE_HIGH: -5,
  OPPONENT_VOID_IN_SUIT: -15,
  MOON_SHOOTER_VOID: -20,
  HEARTS_NOT_BROKEN: -100,
  LOW_HEART_VOID_OPPONENTS: 10,
  HIGH_HEART_VOID_RISK: -20,
  LOW_HEART_LEAD: 15,
  HIGH_HEART_RISK: -15,
  MID_HEART: -5,
  NEVER_LEAD_QUEEN: -200,
  SAVE_SPADE_FOR_QUEEN: -20,
  HIGH_SPADE_CATCH_QUEEN: -25,
  OPPONENT_VOID_MULTIPLIER: -15,
  OPPONENT_HIGH_CARDS_MULTIPLIER: 10,
  SAFE_LOW_LEAD: 15,
} as const;

/** Following phase scoring */
export const FOLLOW_SCORES = {
  BASE: 100,
  TRICK_1_SAFE_WIN: 20,
  TRICK_1_RANK_MULTIPLIER: 2,
  WIN_WITH_POINTS_BASE: -40,
  PENALTY_POINTS_MULTIPLIER: -5,
  SAFE_WIN_LAST_PLAYER: 10,
  RISK_OF_DUMP: -15,
  DUCK: 30, // Boosted from 25 to slightly prefer ducking over risky wins
  MOON_SHOT_TAKE: 50,
  STOP_MOON: 150,
  SAFE_WIN: 20,
  BLUFF_TAKE_SAFE: 15,
} as const;

/** Dumping phase scoring */
export const DUMP_SCORES = {
  BASE: 100,
  QUEEN_OF_SPADES: 200,
  HEART_BASE: 50,
  HEART_RANK_MULTIPLIER: 3,
  HIGH_CARD_RANK_MULTIPLIER: 2,
  KEEP_LOW_SPADE: -25,
  DUMP_ON_LEADER: 30,
  DONT_GIVE_QUEEN_TO_SHOOTER: -350,
  DONT_GIVE_HEARTS_TO_SHOOTER: -200,
  DUMP_ON_NON_SHOOTER: 250,
  HARD_KEEP_SPADE_QUEEN_OUT: -30,
  HARD_KEEP_LOW_SPADE: -10,
} as const;

/** Default AI behavior configuration */
export const DEFAULT_AI_CONFIG = {
  bluffProbability: 0.15,
  memoryTrickCount: 7,
  moonDetectionThreshold: 20,
  leaderPointThreshold: 15,
} as const;

/**
 * Aggressiveness system constants
 *
 * Aggressiveness scale: 0.0 (very conservative) to 1.0 (very aggressive)
 * - 0.0-0.3: Conservative - protect lead, duck often, avoid risky plays
 * - 0.4-0.6: Balanced - current Hard AI behavior
 * - 0.7-1.0: Aggressive - take risks, shoot moon more, dump high cards
 */
export const AGGRESSIVENESS = {
  /** Base aggressiveness range (random at game start) */
  BASE_MIN: 0.3,
  BASE_MAX: 0.7,

  /** Score adjustment calculation */
  SCORE_DIVISOR: 60, // Points behind/ahead to reach max adjustment
  MAX_ADJUSTMENT: 0.3, // Maximum score-based adjustment (+/-)

  /** Moon threshold adjustment */
  MOON_BASE_THRESHOLD: 75,
  MOON_THRESHOLD_RANGE: 30, // Full range of adjustment (+/- 15 from base)

  /** Duck preference multiplier range */
  DUCK_MULTIPLIER_BASE: 1.4,
  DUCK_MULTIPLIER_FACTOR: 0.8, // Subtracted * aggressiveness

  /** Risk tolerance multiplier range (same formula as duck) */
  RISK_MULTIPLIER_BASE: 1.4,
  RISK_MULTIPLIER_FACTOR: 0.8,

  /** High card dump bonus */
  HIGH_CARD_DUMP_MAX_BONUS: 25,

  /** Bluff probability range */
  BLUFF_BASE: 0.08,
  BLUFF_RANGE: 0.22, // Added * aggressiveness

  /** Leader targeting threshold range */
  LEADER_THRESHOLD_BASE: 25,
  LEADER_THRESHOLD_RANGE: 15, // Subtracted * aggressiveness

  /** Leader targeting: aggressive players hold cards for the leader */
  LEADER_TARGETING_MAX: 0.7, // Max factor at 100% aggression
  LATE_ROUND_TRICK_THRESHOLD: 10, // After this, reduce holding behavior
  LATE_ROUND_HOLD_REDUCTION: 0.5, // Halve targeting factor late game
} as const;
