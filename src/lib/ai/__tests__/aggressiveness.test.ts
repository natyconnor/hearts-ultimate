import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateBaseAggressiveness,
  calculateScoreAdjustment,
  getEffectiveAggressiveness,
  getAggressivenessModifiers,
  getAggressivenessLabel,
} from "../strategies/hard/aggressiveness";
import { AGGRESSIVENESS } from "../constants";
import type { GameState } from "../../../types/game";

// Helper to create a minimal game state for testing
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
    heartsBroken: false,
    roundNumber: 1,
    currentTrickNumber: 1,
  };
}

describe("generateBaseAggressiveness", () => {
  it("should return a value between BASE_MIN and BASE_MAX", () => {
    // Run multiple times to test randomness
    for (let i = 0; i < 100; i++) {
      const value = generateBaseAggressiveness();
      expect(value).toBeGreaterThanOrEqual(AGGRESSIVENESS.BASE_MIN);
      expect(value).toBeLessThanOrEqual(AGGRESSIVENESS.BASE_MAX);
    }
  });

  it("should produce varied values across calls", () => {
    const values = new Set<number>();
    for (let i = 0; i < 50; i++) {
      values.add(generateBaseAggressiveness());
    }
    // Should produce many different values (not all the same)
    expect(values.size).toBeGreaterThan(10);
  });
});

describe("calculateScoreAdjustment", () => {
  it("should return 0 when scores are equal", () => {
    const gameState = createGameState([50, 50, 50, 50]);
    const adjustment = calculateScoreAdjustment(gameState, 0);
    expect(adjustment).toBe(0);
  });

  it("should return positive adjustment when behind (losing in Hearts)", () => {
    // Player 0 has 80, others have 50 (player 0 is LOSING - higher score is bad)
    const gameState = createGameState([80, 50, 50, 50]);
    const adjustment = calculateScoreAdjustment(gameState, 0);
    // myScore = 80, avgOpponent = 50, delta = 80 - 50 = +30
    // Positive delta = losing = should be more aggressive
    expect(adjustment).toBeGreaterThan(0);
    expect(adjustment).toBeLessThanOrEqual(AGGRESSIVENESS.MAX_ADJUSTMENT);
  });

  it("should return negative adjustment when ahead (winning in Hearts)", () => {
    // Player 0 has 20, others have 60 (player 0 is WINNING - lower score is good)
    const gameState = createGameState([20, 60, 60, 60]);
    const adjustment = calculateScoreAdjustment(gameState, 0);
    // myScore = 20, avgOpponent = 60, delta = 20 - 60 = -40
    // Negative delta = winning = should be more conservative
    expect(adjustment).toBeLessThan(0);
    expect(adjustment).toBeGreaterThanOrEqual(-AGGRESSIVENESS.MAX_ADJUSTMENT);
  });

  it("should clamp adjustment to MAX_ADJUSTMENT", () => {
    // Player 0 way behind (100 points, others at 10) - LOSING badly
    const gameState = createGameState([100, 10, 10, 10]);
    const adjustment = calculateScoreAdjustment(gameState, 0);
    // Should clamp to positive max (more aggressive when losing)
    expect(adjustment).toBe(AGGRESSIVENESS.MAX_ADJUSTMENT);
  });

  it("should return 0 for empty scores array", () => {
    const gameState = createGameState([]);
    const adjustment = calculateScoreAdjustment(gameState, 0);
    expect(adjustment).toBe(0);
  });

  it("should handle different player indices", () => {
    const gameState = createGameState([20, 60, 60, 60]);

    // Player 0 has 20, avg opponent is 60 - player 0 is WINNING (low score is good)
    // Should get negative adjustment (less aggressive)
    const adj0 = calculateScoreAdjustment(gameState, 0);
    expect(adj0).toBeLessThan(0);

    // Player 1 has 60, avg opponent is (20+60+60)/3 = 46.67 - player 1 is LOSING
    // Should get positive adjustment (more aggressive)
    const adj1 = calculateScoreAdjustment(gameState, 1);
    expect(adj1).toBeGreaterThan(0);
  });
});

describe("getEffectiveAggressiveness", () => {
  it("should combine base and adjustment", () => {
    const gameState = createGameState([50, 50, 50, 50]);
    const base = 0.5;
    const effective = getEffectiveAggressiveness(base, gameState, 0);
    // With equal scores, adjustment is 0, so effective = base
    expect(effective).toBe(base);
  });

  it("should clamp result to [0, 1]", () => {
    // High base + positive adjustment (losing badly) should clamp to 1
    const gameStateLosing = createGameState([90, 30, 30, 30]);
    const effectiveHigh = getEffectiveAggressiveness(0.9, gameStateLosing, 0);
    expect(effectiveHigh).toBeLessThanOrEqual(1);

    // Low base + negative adjustment (winning big) should clamp to 0
    const gameStateWinning = createGameState([10, 70, 70, 70]);
    const effectiveLow = getEffectiveAggressiveness(0.1, gameStateWinning, 0);
    expect(effectiveLow).toBeGreaterThanOrEqual(0);
  });

  it("should increase aggressiveness when losing", () => {
    // Player 0 has 80, others have 40 - player 0 is LOSING (higher score is bad in Hearts)
    const gameState = createGameState([80, 40, 40, 40]);
    const base = 0.5;
    const effective = getEffectiveAggressiveness(base, gameState, 0);
    // myScore = 80, avgOpponent = 40, delta = 80 - 40 = +40
    // Positive adjustment = more aggressive when losing
    expect(effective).toBeGreaterThan(base);
  });

  it("should decrease aggressiveness when winning", () => {
    // Player 0 has 20, others have 60 - player 0 is WINNING (lower score is good in Hearts)
    const gameState = createGameState([20, 60, 60, 60]);
    const base = 0.5;
    const effective = getEffectiveAggressiveness(base, gameState, 0);
    // myScore = 20, avgOpponent = 60, delta = 20 - 60 = -40
    // Negative adjustment = more conservative when winning
    expect(effective).toBeLessThan(base);
  });
});

describe("getAggressivenessModifiers", () => {
  it("should return neutral modifiers at 0.5 aggressiveness", () => {
    const modifiers = getAggressivenessModifiers(0.5);

    // At 0.5, moon threshold adjustment should be 0
    expect(modifiers.moonThresholdAdjustment).toBeCloseTo(0);

    // Duck multiplier at 0.5: 1.4 - 0.5 * 0.8 = 1.0
    expect(modifiers.duckPreferenceMultiplier).toBeCloseTo(1.0);

    // Risk multiplier same formula
    expect(modifiers.riskToleranceMultiplier).toBeCloseTo(1.0);

    // High card dump bonus: 0.5 * 25 = 12.5
    expect(modifiers.highCardDumpBonus).toBeCloseTo(12.5);

    // Bluff probability: 0.08 + 0.5 * 0.22 = 0.19
    expect(modifiers.bluffProbability).toBeCloseTo(0.19);

    // Leader threshold: 25 - 0.5 * 15 = 17.5
    expect(modifiers.leaderTargetThreshold).toBeCloseTo(17.5);

    // Leader targeting factor: 0.5 * 0.7 = 0.35 (moderate preference for leader)
    expect(modifiers.leaderTargetingFactor).toBeCloseTo(0.35);
  });

  it("should return aggressive modifiers at 1.0", () => {
    const modifiers = getAggressivenessModifiers(1.0);

    // Moon threshold: -((1.0 - 0.5) * 30) = -15 (lower threshold)
    expect(modifiers.moonThresholdAdjustment).toBeCloseTo(-15);

    // Duck multiplier: 1.4 - 1.0 * 0.8 = 0.6 (less ducking)
    expect(modifiers.duckPreferenceMultiplier).toBeCloseTo(0.6);

    // High card dump bonus: 1.0 * 25 = 25 (max bonus)
    expect(modifiers.highCardDumpBonus).toBeCloseTo(25);

    // Bluff probability: 0.08 + 1.0 * 0.22 = 0.30 (30%)
    expect(modifiers.bluffProbability).toBeCloseTo(0.30);

    // Leader threshold: 25 - 1.0 * 15 = 10 (target leaders earlier)
    expect(modifiers.leaderTargetThreshold).toBeCloseTo(10);

    // Leader targeting factor: 1.0 * 0.7 = 0.7 (strongly prefer leader)
    expect(modifiers.leaderTargetingFactor).toBeCloseTo(0.7);
  });

  it("should return conservative modifiers at 0.0", () => {
    const modifiers = getAggressivenessModifiers(0.0);

    // Moon threshold: -((0.0 - 0.5) * 30) = 15 (higher threshold)
    expect(modifiers.moonThresholdAdjustment).toBeCloseTo(15);

    // Duck multiplier: 1.4 - 0.0 * 0.8 = 1.4 (more ducking)
    expect(modifiers.duckPreferenceMultiplier).toBeCloseTo(1.4);

    // High card dump bonus: 0.0 * 25 = 0 (no bonus)
    expect(modifiers.highCardDumpBonus).toBeCloseTo(0);

    // Bluff probability: 0.08 + 0.0 * 0.22 = 0.08 (8%)
    expect(modifiers.bluffProbability).toBeCloseTo(0.08);

    // Leader threshold: 25 - 0.0 * 15 = 25 (target leaders later)
    expect(modifiers.leaderTargetThreshold).toBeCloseTo(25);

    // Leader targeting factor: 0.0 * 0.7 = 0 (dump on anyone)
    expect(modifiers.leaderTargetingFactor).toBeCloseTo(0);
  });
});

describe("getAggressivenessLabel", () => {
  it("should return correct labels for different levels", () => {
    expect(getAggressivenessLabel(0.0)).toBe("Very Conservative");
    expect(getAggressivenessLabel(0.2)).toBe("Very Conservative");
    expect(getAggressivenessLabel(0.35)).toBe("Conservative");
    expect(getAggressivenessLabel(0.5)).toBe("Balanced");
    expect(getAggressivenessLabel(0.6)).toBe("Aggressive");
    expect(getAggressivenessLabel(0.8)).toBe("Very Aggressive");
    expect(getAggressivenessLabel(1.0)).toBe("Very Aggressive");
  });

  it("should handle boundary values", () => {
    expect(getAggressivenessLabel(0.3)).toBe("Conservative");
    expect(getAggressivenessLabel(0.45)).toBe("Balanced");
    expect(getAggressivenessLabel(0.55)).toBe("Aggressive");
    expect(getAggressivenessLabel(0.7)).toBe("Very Aggressive");
  });
});
