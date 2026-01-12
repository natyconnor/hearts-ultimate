import { describe, it, expect } from "vitest";
import { scoreDumpCards } from "../dumpScoring";
import { CardMemory } from "../../../memory/cardMemory";
import {
  DEFAULT_AI_CONFIG,
  DUMP_SCORES,
  AGGRESSIVENESS,
} from "../../../constants";
import { getAggressivenessModifiers } from "../aggressiveness";
import type { PlayContext } from "../../../types";
import type { GameState, Card } from "../../../../../types/game";
import { createCard } from "../../../../../game/deck";

// Helper to create a minimal game state
function createGameState(scores: number[]): GameState {
  return {
    players: scores.map((_, i) => ({
      id: `player-${i}`,
      name: `Player ${i}`,
      isAI: i > 0,
      hand: [],
      score: 0,
    })),
    hands: [[], [], [], []],
    currentTrick: [],
    scores,
    roundScores: [0, 0, 0, 0],
    heartsBroken: true,
    roundNumber: 1,
    currentTrickNumber: 1,
  };
}

// Helper to create a play context
function createContext(
  gameState: GameState,
  playerIndex: number,
  currentTrickCards: Array<{ playerId: string; card: Card }>,
  tricksPlayedThisRound: number
): PlayContext {
  return {
    gameState,
    playerIndex,
    validCards: [],
    isLeading: false,
    leadSuit: currentTrickCards[0]?.card.suit ?? null,
    currentTrickCards,
    tricksPlayedThisRound,
    isFirstTrick: false,
  };
}

// Create the Q♠ card
const queenOfSpades: Card = createCard("spades", 12);
const aceOfHearts: Card = createCard("hearts", 14);

describe("Leader Targeting - Queen of Spades", () => {
  it("should give full bonus when winner IS the leader", () => {
    // Player 0 (leader with lowest score) is winning the trick
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-0", card: { suit: "clubs", rank: 10 } as Card },
    ];
    const context = createContext(gameState, 2, trickCards, 5);
    const memory = new CardMemory(7);
    const modifiers = getAggressivenessModifiers(0.8); // Aggressive

    const scored = scoreDumpCards(
      [queenOfSpades],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    // Should get full Q♠ bonus (200) + dump on leader bonus (30) = 330 total
    // Plus base 100 = 330
    expect(scored[0].score).toBeGreaterThanOrEqual(
      DUMP_SCORES.BASE +
        DUMP_SCORES.QUEEN_OF_SPADES +
        DUMP_SCORES.DUMP_ON_LEADER
    );
    expect(scored[0].reasons).toContain("Dump Q♠ on leader!");
  });

  it("should give reduced bonus when winner is NOT leader (aggressive AI)", () => {
    // Player 1 (not the leader) is winning the trick
    // Player 0 has lowest score (is the leader)
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-1", card: { suit: "clubs", rank: 10 } as Card },
    ];
    const context = createContext(gameState, 2, trickCards, 5);
    const memory = new CardMemory(7);
    const modifiers = getAggressivenessModifiers(0.8); // Aggressive (factor = 0.56)

    const scored = scoreDumpCards(
      [queenOfSpades],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    // Should get reduced bonus due to leader targeting
    // Base 200 * (1 - 0.56) = 88, plus base 100 = 188
    expect(scored[0].score).toBeLessThan(
      DUMP_SCORES.BASE + DUMP_SCORES.QUEEN_OF_SPADES
    );
    expect(scored[0].reasons).toContain("Hold Q♠ for leader");
  });

  it("should give full bonus when winner is NOT leader (conservative AI)", () => {
    // Player 1 (not the leader) is winning the trick
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-1", card: { suit: "clubs", rank: 10 } as Card },
    ];
    const context = createContext(gameState, 2, trickCards, 5);
    const memory = new CardMemory(7);
    const modifiers = getAggressivenessModifiers(0.0); // Conservative (factor = 0)

    const scored = scoreDumpCards(
      [queenOfSpades],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    // Conservative AI should dump regardless
    expect(scored[0].score).toBe(
      DUMP_SCORES.BASE + DUMP_SCORES.QUEEN_OF_SPADES
    );
    expect(scored[0].reasons).toContain("Dump Q♠!");
  });

  it("should reduce holding behavior late in the round", () => {
    // Player 1 (not the leader) is winning the trick
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-1", card: { suit: "clubs", rank: 10 } as Card },
    ];

    // Early round (trick 5)
    const contextEarly = createContext(gameState, 2, trickCards, 4);
    // Late round (trick 11)
    const contextLate = createContext(gameState, 2, trickCards, 10);

    const memory = new CardMemory(7);
    const modifiers = getAggressivenessModifiers(1.0); // Max aggressive

    const scoredEarly = scoreDumpCards(
      [queenOfSpades],
      contextEarly,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    const scoredLate = scoreDumpCards(
      [queenOfSpades],
      contextLate,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    // Late round should have higher score (less holding) than early round
    expect(scoredLate[0].score).toBeGreaterThan(scoredEarly[0].score);
  });

  it("should still prioritize moon defense over leader targeting", () => {
    // Player 1 is shooting the moon and winning the trick
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-1", card: { suit: "clubs", rank: 10 } as Card },
    ];
    const context = createContext(gameState, 2, trickCards, 5);
    const memory = new CardMemory(7);
    const modifiers = getAggressivenessModifiers(0.8);

    const scored = scoreDumpCards(
      [queenOfSpades],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      1, // Player 1 is shooting the moon
      false,
      modifiers
    );

    // Should NOT dump Q♠ on moon shooter
    expect(scored[0].score).toBeLessThan(DUMP_SCORES.BASE);
    expect(scored[0].reasons).toContain("Don't give Q♠ to moon shooter");
  });
});

describe("Leader Targeting - Hearts", () => {
  it("should give bonus when dumping heart on leader", () => {
    // Player 0 (leader) is winning the trick
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-0", card: { suit: "clubs", rank: 10 } as Card },
    ];
    const context = createContext(gameState, 2, trickCards, 5);
    const memory = new CardMemory(7);
    const modifiers = getAggressivenessModifiers(0.8);

    const scored = scoreDumpCards(
      [aceOfHearts],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    // Should get heart bonus + leader bonus
    const baseHeartBonus =
      DUMP_SCORES.HEART_BASE + 14 * DUMP_SCORES.HEART_RANK_MULTIPLIER;
    expect(scored[0].score).toBe(
      DUMP_SCORES.BASE + baseHeartBonus + DUMP_SCORES.DUMP_ON_LEADER
    );
    expect(scored[0].reasons).toContain("Dump heart on leader!");
  });

  it("should apply reduced holding factor for hearts (half of Q♠)", () => {
    // Player 1 (not leader) is winning
    const gameState = createGameState([10, 50, 50, 50]);
    const trickCards = [
      { playerId: "player-1", card: { suit: "clubs", rank: 10 } as Card },
    ];
    const context = createContext(gameState, 2, trickCards, 5);
    const memory = new CardMemory(7);

    // At 1.0 aggression: Q♠ factor = 0.7, heart factor = 0.35
    const modifiers = getAggressivenessModifiers(1.0);

    const qsScored = scoreDumpCards(
      [queenOfSpades],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    const heartScored = scoreDumpCards(
      [aceOfHearts],
      context,
      memory,
      DEFAULT_AI_CONFIG,
      null,
      false,
      modifiers
    );

    // Hearts should have less penalty (higher score relative to base) than Q♠
    // Q♠ base = 200, reduced to 200 * 0.3 = 60
    // Heart base = 50 + 14*3 = 92, reduced to 92 * 0.65 = 59.8
    // The percentage reduction for hearts should be smaller
    const qsReduction =
      (DUMP_SCORES.QUEEN_OF_SPADES - (qsScored[0].score - DUMP_SCORES.BASE)) /
      DUMP_SCORES.QUEEN_OF_SPADES;
    const heartBase =
      DUMP_SCORES.HEART_BASE + 14 * DUMP_SCORES.HEART_RANK_MULTIPLIER;
    const heartReduction =
      (heartBase - (heartScored[0].score - DUMP_SCORES.BASE)) / heartBase;

    // Heart reduction should be about half of Q♠ reduction
    expect(heartReduction).toBeLessThan(qsReduction);
  });
});

describe("Leader Targeting Factor Calculation", () => {
  it("should scale leaderTargetingFactor with aggressiveness", () => {
    const conservative = getAggressivenessModifiers(0.0);
    const balanced = getAggressivenessModifiers(0.5);
    const aggressive = getAggressivenessModifiers(1.0);

    expect(conservative.leaderTargetingFactor).toBe(0);
    expect(balanced.leaderTargetingFactor).toBeCloseTo(0.35);
    expect(aggressive.leaderTargetingFactor).toBeCloseTo(
      AGGRESSIVENESS.LEADER_TARGETING_MAX
    );
  });
});
