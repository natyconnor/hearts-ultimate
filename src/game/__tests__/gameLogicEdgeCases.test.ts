import { describe, it, expect } from "vitest";
import {
  playCard,
  finalizePassingPhase,
  completeRevealPhase,
} from "../gameLogic";
import { createCard } from "../deck";
import type { Card, GameState } from "../../types/game";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  createCard(suit, rank);

const createTestGameState = (overrides?: Partial<GameState>): GameState => ({
  players: [
    { id: "p1", name: "Player 1", isAI: false, hand: [], score: 0 },
    { id: "p2", name: "Player 2", isAI: false, hand: [], score: 0 },
    { id: "p3", name: "Player 3", isAI: false, hand: [], score: 0 },
    { id: "p4", name: "Player 4", isAI: false, hand: [], score: 0 },
  ],
  hands: [[], [], [], []],
  currentTrick: [],
  scores: [0, 0, 0, 0],
  roundScores: [0, 0, 0, 0],
  heartsBroken: false,
  roundNumber: 1,
  currentTrickNumber: 1,
  currentPlayerIndex: 0,
  ...overrides,
});

describe("gameLogic - edge cases", () => {
  describe("playCard - invalid states", () => {
    it("handles player not found", () => {
      const state = createTestGameState();
      const result = playCard(state, "nonexistent", card("clubs", 2));

      expect(result.error).toBe("Player not found");
      expect(result.gameState).toBe(state); // State unchanged
    });

    it("handles card not in hand", () => {
      const state = createTestGameState();
      state.players[0].hand = [card("clubs", 5)];
      state.hands[0] = [card("clubs", 5)];

      const result = playCard(state, "p1", card("clubs", 10));

      expect(result.error).toBeDefined();
      expect(result.error).toContain("not in hand");
    });

    it("handles playing when not your turn", () => {
      const state = createTestGameState({ currentPlayerIndex: 1 });
      state.players[0].hand = [card("clubs", 2)];

      const result = playCard(state, "p1", card("clubs", 2));

      expect(result.error).toBe("Not your turn");
    });
  });

  describe("playCard - first trick edge cases", () => {
    it("prevents leading non-2♣ in first trick", () => {
      const state = createTestGameState();
      state.players[0].hand = [card("clubs", 5), card("clubs", 2)];
      state.hands[0] = [card("clubs", 5), card("clubs", 2)];

      const result = playCard(state, "p1", card("clubs", 5));

      expect(result.error).toBeDefined();
      expect(result.error).toContain("2 of clubs");
    });

    it("allows 2♣ to lead first trick", () => {
      const state = createTestGameState();
      state.players[0].hand = [card("clubs", 2)];
      state.hands[0] = [card("clubs", 2)];

      const result = playCard(state, "p1", card("clubs", 2));

      expect(result.error).toBeUndefined();
      expect(result.gameState.currentTrick).toHaveLength(1);
    });

    it("prevents penalty cards in first trick", () => {
      const state = createTestGameState();
      state.currentTrick = [{ playerId: "p1", card: card("clubs", 2) }];
      state.players[1].hand = [card("hearts", 7), card("clubs", 5)];
      state.hands[1] = [card("hearts", 7), card("clubs", 5)];
      state.currentPlayerIndex = 1;

      const result = playCard(state, "p2", card("hearts", 7));

      expect(result.error).toBeDefined();
      expect(result.error).toContain("points");
    });
  });

  describe("playCard - hearts broken edge cases", () => {
    it("prevents leading hearts before broken", () => {
      const state = createTestGameState({
        currentTrickNumber: 2,
        heartsBroken: false,
      });
      state.players[0].hand = [card("hearts", 7), card("clubs", 5)];
      state.hands[0] = [card("hearts", 7), card("clubs", 5)];

      const result = playCard(state, "p1", card("hearts", 7));

      expect(result.error).toBeDefined();
      expect(result.error).toContain("broken");
    });

    it("allows leading hearts if only hearts remain", () => {
      const state = createTestGameState({
        currentTrickNumber: 2,
        heartsBroken: false,
      });
      state.players[0].hand = [card("hearts", 7), card("hearts", 10)];
      state.hands[0] = [card("hearts", 7), card("hearts", 10)];

      const result = playCard(state, "p1", card("hearts", 7));

      expect(result.error).toBeUndefined();
    });

    it("allows leading hearts after broken", () => {
      const state = createTestGameState({
        currentTrickNumber: 2,
        heartsBroken: true,
      });
      state.players[0].hand = [card("hearts", 7), card("clubs", 5)];
      state.hands[0] = [card("hearts", 7), card("clubs", 5)];

      const result = playCard(state, "p1", card("hearts", 7));

      expect(result.error).toBeUndefined();
    });
  });

  describe("playCard - follow suit edge cases", () => {
    it("requires following suit when possible", () => {
      const state = createTestGameState({ currentTrickNumber: 2 });
      state.currentTrick = [{ playerId: "p1", card: card("clubs", 5) }];
      state.players[1].hand = [card("clubs", 7), card("hearts", 10)];
      state.hands[1] = [card("clubs", 7), card("hearts", 10)];
      state.currentPlayerIndex = 1;

      const result = playCard(state, "p2", card("hearts", 10));

      expect(result.error).toBeDefined();
      expect(result.error).toContain("follow suit");
    });

    it("allows any card when cannot follow suit", () => {
      const state = createTestGameState({ currentTrickNumber: 2 });
      state.currentTrick = [{ playerId: "p1", card: card("clubs", 5) }];
      state.players[1].hand = [card("hearts", 10), card("spades", 12)];
      state.hands[1] = [card("hearts", 10), card("spades", 12)];
      state.currentPlayerIndex = 1;

      const result = playCard(state, "p2", card("hearts", 10));

      expect(result.error).toBeUndefined();
    });
  });

  describe("playCard - trick completion edge cases", () => {
    it("handles trick completion with all penalty cards", () => {
      const state = createTestGameState({
        currentPlayerIndex: 3,
        currentTrickNumber: 2,
      });
      state.currentTrick = [
        { playerId: "p1", card: card("hearts", 5) },
        { playerId: "p2", card: card("hearts", 7) },
        { playerId: "p3", card: card("spades", 12) }, // Q♠
      ];
      state.players[3].hand = [card("hearts", 10)];
      state.hands[3] = [card("hearts", 10)];
      // Ensure round not complete
      state.players[0].hand = [card("clubs", 5)];
      state.players[1].hand = [card("clubs", 6)];
      state.players[2].hand = [card("clubs", 7)];
      state.hands[0] = [card("clubs", 5)];
      state.hands[1] = [card("clubs", 6)];
      state.hands[2] = [card("clubs", 7)];

      const result = playCard(state, "p4", card("hearts", 10));

      expect(result.error).toBeUndefined();
      // Winner should get all points (3 hearts + Q♠ = 16 points)
      const winnerIndex = result.gameState.lastTrickWinnerIndex!;
      const pointsTaken = result.gameState.pointsCardsTaken![winnerIndex];
      expect(pointsTaken.length).toBe(4); // 3 hearts + Q♠
    });

    it("handles round completion exactly at 100 points", () => {
      const state = createTestGameState({
        currentPlayerIndex: 3,
        scores: [99, 80, 70, 60],
        roundScores: [1, 0, 0, 0],
      });
      state.players[0].hand = [];
      state.players[1].hand = [];
      state.players[2].hand = [];
      state.players[3].hand = [card("clubs", 7)];
      state.currentTrick = [
        { playerId: "p1", card: card("clubs", 2) },
        { playerId: "p2", card: card("clubs", 5) },
        { playerId: "p3", card: card("clubs", 10) },
      ];

      const result = playCard(state, "p4", card("clubs", 7));

      expect(result.gameState.isGameOver).toBe(true);
      expect(result.gameState.scores[0]).toBe(100);
    });

    it("handles round completion just below 100 points", () => {
      const state = createTestGameState({
        currentPlayerIndex: 3,
        scores: [98, 80, 70, 60],
        roundScores: [1, 0, 0, 0],
      });
      state.players[0].hand = [];
      state.players[1].hand = [];
      state.players[2].hand = [];
      state.players[3].hand = [card("clubs", 7)];
      state.currentTrick = [
        { playerId: "p1", card: card("clubs", 2) },
        { playerId: "p2", card: card("clubs", 5) },
        { playerId: "p3", card: card("clubs", 10) },
      ];

      const result = playCard(state, "p4", card("clubs", 7));

      expect(result.gameState.isGameOver).toBe(false);
      expect(result.gameState.scores[0]).toBe(99);
    });
  });

  describe("playCard - moon shooting edge cases", () => {
    it("handles moon shot with exactly 26 points", () => {
      const state = createTestGameState({
        currentPlayerIndex: 3,
        roundScores: [26, 0, 0, 0],
      });
      state.players[0].hand = [];
      state.players[1].hand = [];
      state.players[2].hand = [];
      state.players[3].hand = [card("clubs", 7)];
      state.currentTrick = [
        { playerId: "p1", card: card("clubs", 2) },
        { playerId: "p2", card: card("clubs", 5) },
        { playerId: "p3", card: card("clubs", 10) },
      ];

      const result = playCard(state, "p4", card("clubs", 7));

      expect(result.gameState.shotTheMoon).toBeDefined();
      expect(result.gameState.shotTheMoon?.playerIndex).toBe(0);
      // Moon shooter gets 0, others get 26
      expect(result.gameState.roundScores[0]).toBe(0);
      expect(result.gameState.roundScores[1]).toBe(26);
      expect(result.gameState.roundScores[2]).toBe(26);
      expect(result.gameState.roundScores[3]).toBe(26);
    });

    it("handles near-moon (25 points)", () => {
      const state = createTestGameState({
        currentPlayerIndex: 3,
        roundScores: [25, 1, 0, 0],
      });
      state.players[0].hand = [];
      state.players[1].hand = [];
      state.players[2].hand = [];
      state.players[3].hand = [card("clubs", 7)];
      state.currentTrick = [
        { playerId: "p1", card: card("clubs", 2) },
        { playerId: "p2", card: card("clubs", 5) },
        { playerId: "p3", card: card("clubs", 10) },
      ];

      const result = playCard(state, "p4", card("clubs", 7));

      expect(result.gameState.shotTheMoon).toBeNull();
      // No moon adjustment
      expect(result.gameState.roundScores[0]).toBe(25);
    });
  });

  describe("finalizePassingPhase - edge cases", () => {
    it("transitions to play phase when called", () => {
      const state = createTestGameState({
        isPassingPhase: true,
        passDirection: "left",
        passSubmissions: [
          {
            playerId: "p1",
            cards: [card("clubs", 5), card("clubs", 6), card("clubs", 7)],
          },
          {
            playerId: "p2",
            cards: [card("hearts", 5), card("hearts", 6), card("hearts", 7)],
          },
          {
            playerId: "p3",
            cards: [card("spades", 5), card("spades", 6), card("spades", 7)],
          },
          {
            playerId: "p4",
            cards: [
              card("diamonds", 5),
              card("diamonds", 6),
              card("diamonds", 7),
            ],
          },
        ],
      });
      // Need someone with 2 of clubs for initializeRound
      state.players[0].hand = [card("clubs", 2)];
      state.hands[0] = [card("clubs", 2)];

      const result = finalizePassingPhase(state);

      expect(result.isPassingPhase).toBe(false);
      expect(result.isRevealPhase).toBe(false);
      expect(result.currentPlayerIndex).toBeDefined();
    });
  });

  describe("completeRevealPhase - edge cases", () => {
    it("transitions from reveal phase to play", () => {
      const state = createTestGameState({
        isRevealPhase: true,
        receivedCards: [[], [], [], []],
      });
      // Need someone with 2 of clubs for initializeRound
      state.players[0].hand = [card("clubs", 2)];
      state.hands[0] = [card("clubs", 2)];

      const result = completeRevealPhase(state);

      expect(result.isRevealPhase).toBe(false);
      expect(result.isPassingPhase).toBe(false);
      expect(result.currentPlayerIndex).toBeDefined();
    });
  });
});
