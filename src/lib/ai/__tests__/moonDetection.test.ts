/**
 * Tests for moon shooter detection logic
 */

import { describe, it, expect, beforeEach } from "vitest";
import { detectMoonShooter } from "../strategies/hard/moonDetection";
import { CardMemory } from "../memory/cardMemory";
import type { GameState, Card } from "../../../types/game";
import type { AIConfig } from "../types";
import { DEFAULT_AI_CONFIG } from "../constants";

// Helper to create cards quickly
const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({
  suit,
  rank,
  points: suit === "hearts" ? 1 : suit === "spades" && rank === 12 ? 13 : 0,
});

// Helper to create a minimal game state
function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [
      { id: "p1", name: "Alice", isAI: false, hand: [], score: 0 },
      { id: "p2", name: "Bob", isAI: false, hand: [], score: 0 },
      { id: "p3", name: "Charlie", isAI: false, hand: [], score: 0 },
      { id: "p4", name: "Diana", isAI: false, hand: [], score: 0 },
    ],
    hands: [[], [], [], []],
    currentTrick: [],
    scores: [0, 0, 0, 0],
    roundScores: [0, 0, 0, 0],
    pointsCardsTaken: [[], [], [], []],
    heartsBroken: false,
    roundNumber: 1,
    currentTrickNumber: 1,
    ...overrides,
  };
}

describe("detectMoonShooter", () => {
  let config: AIConfig;
  let memory: CardMemory;

  beforeEach(() => {
    config = { ...DEFAULT_AI_CONFIG };
    memory = new CardMemory();
  });

  describe("score-based detection", () => {
    it("should detect moon shooter when they have all points", () => {
      const gameState = createGameState({
        roundScores: [20, 0, 0, 0],
        pointsCardsTaken: [
          [
            card("hearts", 10),
            card("hearts", 11),
            card("hearts", 12),
            card("spades", 12),
          ], // Q♠ + hearts
          [],
          [],
          [],
        ],
      });

      const result = detectMoonShooter(gameState, config);

      expect(result).toBe(0); // Alice is shooting
    });

    it("should NOT detect if multiple players have points", () => {
      const gameState = createGameState({
        roundScores: [15, 5, 0, 0],
        pointsCardsTaken: [
          [card("hearts", 10), card("hearts", 11)],
          [card("hearts", 12)],
          [],
          [],
        ],
      });

      const result = detectMoonShooter(gameState, config);

      expect(result).toBeNull();
    });

    it("should detect based on Q♠ + 5+ hearts", () => {
      const gameState = createGameState({
        roundScores: [18, 0, 0, 0], // Q♠ (13) + 5 hearts (5) = 18
        pointsCardsTaken: [
          [
            card("spades", 12), // Q♠
            card("hearts", 10),
            card("hearts", 11),
            card("hearts", 12),
            card("hearts", 13),
            card("hearts", 14),
          ],
          [],
          [],
          [],
        ],
      });

      const result = detectMoonShooter(gameState, config);

      expect(result).toBe(0);
    });

    it("should detect based on 8+ hearts without Q♠", () => {
      const gameState = createGameState({
        roundScores: [8, 0, 0, 0],
        pointsCardsTaken: [
          [
            card("hearts", 2),
            card("hearts", 3),
            card("hearts", 4),
            card("hearts", 5),
            card("hearts", 6),
            card("hearts", 7),
            card("hearts", 8),
            card("hearts", 9),
          ],
          [],
          [],
          [],
        ],
      });

      const result = detectMoonShooter(gameState, config);

      expect(result).toBe(0);
    });

    it("should detect based on 10+ hearts", () => {
      const gameState = createGameState({
        roundScores: [10, 0, 0, 0],
        pointsCardsTaken: [
          Array.from({ length: 10 }, (_, i) =>
            card("hearts", (i + 2) as Card["rank"])
          ),
          [],
          [],
          [],
        ],
      });

      const result = detectMoonShooter(gameState, config);

      expect(result).toBe(0);
    });
  });

  describe("behavioral detection", () => {
    it("should detect player who led Q♠ voluntarily", () => {
      const gameState = createGameState({
        roundScores: [0, 0, 0, 0], // No points yet
      });

      const playerIndices = new Map([
        ["p1", 0],
        ["p2", 1],
        ["p3", 2],
        ["p4", 3],
      ]);

      memory.recordTrick(
        [
          { playerId: "p1", card: card("spades", 12) }, // Led Q♠!
          { playerId: "p2", card: card("spades", 2) },
          { playerId: "p3", card: card("spades", 3) },
          { playerId: "p4", card: card("spades", 4) },
        ],
        playerIndices,
        "spades",
        "p1"
      );

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBe(0); // Alice led Q♠ - instant detection
    });

    it("should detect based on high behavioral suspicion score", () => {
      const gameState = createGameState({
        roundScores: [0, 0, 0, 0],
      });

      const playerIndices = new Map([
        ["p1", 0],
        ["p2", 1],
        ["p3", 2],
        ["p4", 3],
      ]);

      // Record multiple high card leads (using Q, K, A - ranks 12, 13, 14)
      const highRanks: Card["rank"][] = [12, 13, 14, 12, 13, 14]; // Q, K, A repeated
      for (let i = 0; i < 6; i++) {
        memory.recordTrick(
          [
            { playerId: "p1", card: card("clubs", highRanks[i]) }, // High cards
            { playerId: "p2", card: card("clubs", 2) },
            { playerId: "p3", card: card("clubs", 3) },
            { playerId: "p4", card: card("clubs", 4) },
          ],
          playerIndices,
          "clubs",
          "p1"
        );
      }

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBe(0); // High suspicion score
    });

    it("should detect with moderate points + behavioral signals", () => {
      const gameState = createGameState({
        roundScores: [8, 0, 0, 0], // 8 points
      });

      const playerIndices = new Map([
        ["p1", 0],
        ["p2", 1],
        ["p3", 2],
        ["p4", 3],
      ]);

      // Record some suspicious behavior
      for (let i = 0; i < 3; i++) {
        memory.recordTrick(
          [
            { playerId: "p1", card: card("clubs", 13) }, // High card
            { playerId: "p2", card: card("clubs", 2) },
            { playerId: "p3", card: card("clubs", 3) },
            { playerId: "p4", card: card("clubs", 4) },
          ],
          playerIndices,
          "clubs",
          "p1"
        );
      }

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBe(0); // 8 points + behavioral signals
    });

    it("should NOT detect if others have points", () => {
      const gameState = createGameState({
        roundScores: [10, 5, 0, 0], // Others have points
      });

      const playerIndices = new Map([
        ["p1", 0],
        ["p2", 1],
        ["p3", 2],
        ["p4", 3],
      ]);

      memory.recordTrick(
        [
          { playerId: "p1", card: card("clubs", 14) },
          { playerId: "p2", card: card("clubs", 2) },
          { playerId: "p3", card: card("clubs", 3) },
          { playerId: "p4", card: card("clubs", 4) },
        ],
        playerIndices,
        "clubs",
        "p1"
      );

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBeNull(); // Others have points, can't be shooting
    });
  });

  describe("real-time detection", () => {
    it("should detect when current leader plays Q♠ with no points", () => {
      const gameState = createGameState({
        roundScores: [0, 0, 0, 0],
      });

      const currentTrick = [
        { playerId: "p1", card: card("spades", 12) }, // Leading Q♠!
      ];

      const result = detectMoonShooter(gameState, config, memory, currentTrick);

      expect(result).toBe(0);
    });

    it("should detect when current leader plays high hearts with 3+ points", () => {
      const gameState = createGameState({
        roundScores: [3, 0, 0, 0], // Already has 3 points
      });

      const currentTrick = [
        { playerId: "p1", card: card("hearts", 12) }, // Leading high heart (Q+)
      ];

      const result = detectMoonShooter(gameState, config, memory, currentTrick);

      expect(result).toBe(0);
    });

    it("should NOT detect high heart lead with 0 points", () => {
      const gameState = createGameState({
        roundScores: [0, 0, 0, 0],
        currentTrick: [
          { playerId: "p1", card: card("hearts", 13) }, // High heart but no points yet
        ],
      });

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBeNull(); // Too early
    });
  });

  describe("edge cases", () => {
    it("should return null when no moon shooter detected", () => {
      const gameState = createGameState({
        roundScores: [5, 3, 2, 1], // Everyone has points
      });

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBeNull();
    });

    it("should handle missing memory gracefully", () => {
      const gameState = createGameState({
        roundScores: [20, 0, 0, 0],
      });

      const result = detectMoonShooter(gameState, config); // No memory

      expect(result).toBe(0); // Still works with score-based detection
    });

    it("should handle missing pointsCardsTaken gracefully", () => {
      const gameState = createGameState({
        roundScores: [20, 0, 0, 0],
        pointsCardsTaken: undefined,
      });

      const result = detectMoonShooter(gameState, config, memory);

      expect(result).toBe(0); // Still works with score-based detection
    });
  });
});
