/**
 * AI Type Definitions
 */

import type { Card, CardSuit, GameState, AIDifficulty } from "../../types/game";

export type { AIDifficulty } from "../../types/game";

/**
 * AI Version - increment when behavior changes.
 *
 * History:
 * v1: Initial implementation
 * v2: Fixed isFirstTrick(), memory logic, smarter heart leading
 * v3: Fixed memory never updating, added lifecycle hooks
 * v4: Explicit currentTrickNumber, Q♠ current trick detection, proportional penalties
 * v5: Low card protection during passing
 * v6: Proactive moon shooting, detection, and prevention
 * v7: Fixed players after us bug and ducking evaluation
 * v8: Fixed mid-range cards scoring 0 during passing
 */
export const AI_VERSION = 8;

/** Context for play decisions */
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

/** Context for passing decisions */
export interface PassContext {
  hand: Card[];
  passDirection: "left" | "right" | "across";
  gameState: GameState;
  playerIndex: number;
}

/** Memory of a played card */
export interface PlayedCardMemory {
  card: Card;
  playerId: string;
  playerIndex: number;
  trickNumber: number;
  wasVoidPlay: boolean;
}

/** Player void suit tracking */
export interface PlayerVoidMemory {
  playerId: string;
  playerIndex: number;
  voidSuits: Set<CardSuit>;
}

/** Trick win analysis result */
export interface TrickWinAnalysis {
  willWin: boolean;
  currentWinningCard: Card | null;
  currentWinningPlayerIndex: number | null;
  penaltyPointsInTrick: number;
  hasQueenOfSpades: boolean;
}

/** Suit distribution count */
export interface SuitDistribution {
  clubs: number;
  diamonds: number;
  spades: number;
  hearts: number;
}

/** Card with decision score */
export interface ScoredCard {
  card: Card;
  score: number;
  reasons?: string[];
}

/** AI strategy interface */
export interface AIStrategy {
  readonly difficulty: AIDifficulty;
  chooseCardsToPass(context: PassContext): Card[];
  chooseCardToPlay(context: PlayContext): Card;
  onTrickComplete?(
    trick: Array<{ playerId: string; card: Card }>,
    winnerIndex: number,
    trickNumber: number,
    gameState?: GameState
  ): void;
  onRoundStart?(): void;
}

/** AI behavior configuration */
export interface AIConfig {
  bluffProbability: number;
  memoryTrickCount: number;
  moonDetectionThreshold: number;
  leaderPointThreshold: number;
}
