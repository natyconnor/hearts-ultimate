import { describe, it, expect } from "vitest";
import {
  executePassPhase,
  submitPassSelection,
  validatePassSelection,
  getPassTargetIndex,
} from "../passingLogic";
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
  ...overrides,
});

describe("passingLogic - edge cases", () => {
  describe("validatePassSelection", () => {
    it("rejects wrong number of cards", () => {
      const hand = [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
        card("diamonds", 8),
      ];

      expect(validatePassSelection([], hand).valid).toBe(false);
      expect(validatePassSelection([card("clubs", 5)], hand).valid).toBe(false);
      expect(validatePassSelection([card("clubs", 5), card("hearts", 7)], hand).valid).toBe(false);
      expect(validatePassSelection([card("clubs", 5), card("hearts", 7), card("spades", 10), card("diamonds", 8)], hand).valid).toBe(false);
    });

    it("rejects cards not in hand", () => {
      const hand = [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
      ];
      const selected = [
        card("clubs", 5),
        card("hearts", 7),
        card("diamonds", 8), // Not in hand
      ];

      const result = validatePassSelection(selected, hand);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not in hand");
    });

    it("rejects duplicate cards", () => {
      const hand = [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
      ];
      const selected = [
        card("clubs", 5),
        card("clubs", 5), // Duplicate
        card("hearts", 7),
      ];

      const result = validatePassSelection(selected, hand);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("duplicate");
    });

    it("accepts valid selection", () => {
      const hand = [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
        card("diamonds", 8),
      ];
      const selected = [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
      ];

      expect(validatePassSelection(selected, hand).valid).toBe(true);
    });
  });

  describe("submitPassSelection - edge cases", () => {
    it("prevents duplicate submissions", () => {
      const state = createTestGameState({
        isPassingPhase: true,
        passDirection: "left",
        passSubmissions: [
          {
            playerId: "p1",
            cards: [card("clubs", 5), card("hearts", 7), card("spades", 10)],
          },
        ],
      });
      state.players[0].hand = [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
      ];

      const result = submitPassSelection(state, "p1", [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10),
      ]);

      expect(result.error).toBe("Already submitted pass selection");
    });

    it("validates cards are in hand", () => {
      const state = createTestGameState({
        isPassingPhase: true,
        passDirection: "left",
        passSubmissions: [],
      });
      state.players[0].hand = [card("clubs", 5), card("hearts", 7)];

      const result = submitPassSelection(state, "p1", [
        card("clubs", 5),
        card("hearts", 7),
        card("spades", 10), // Not in hand
      ]);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("not in hand");
    });
  });

  describe("executePassPhase - edge cases", () => {
    it("handles pass left correctly", () => {
      const state = createTestGameState({
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
            cards: [card("diamonds", 5), card("diamonds", 6), card("diamonds", 7)],
          },
        ],
      });

      // Set initial hands
      state.players[0].hand = [
        card("clubs", 5),
        card("clubs", 6),
        card("clubs", 7),
        card("clubs", 10),
      ];
      state.players[1].hand = [
        card("hearts", 5),
        card("hearts", 6),
        card("hearts", 7),
        card("hearts", 10),
      ];
      state.players[2].hand = [
        card("spades", 5),
        card("spades", 6),
        card("spades", 7),
        card("spades", 10),
      ];
      state.players[3].hand = [
        card("diamonds", 5),
        card("diamonds", 6),
        card("diamonds", 7),
        card("diamonds", 10),
      ];
      state.hands = [
        state.players[0].hand,
        state.players[1].hand,
        state.players[2].hand,
        state.players[3].hand,
      ];

      const result = executePassPhase(state);

      expect(result.error).toBeUndefined();
      // Player 0 should receive from player 3 (left of p0)
      const p0Hand = result.gameState.players[0].hand;
      const hasDiamond5 = p0Hand.some((c) => c.suit === "diamonds" && c.rank === 5);
      expect(hasDiamond5).toBe(true);
    });

    it("handles pass right correctly", () => {
      const state = createTestGameState({
        passDirection: "right",
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
            cards: [card("diamonds", 5), card("diamonds", 6), card("diamonds", 7)],
          },
        ],
      });

      state.players[0].hand = [
        card("clubs", 5),
        card("clubs", 6),
        card("clubs", 7),
        card("clubs", 10),
      ];
      state.players[1].hand = [
        card("hearts", 5),
        card("hearts", 6),
        card("hearts", 7),
        card("hearts", 10),
      ];
      state.players[2].hand = [
        card("spades", 5),
        card("spades", 6),
        card("spades", 7),
        card("spades", 10),
      ];
      state.players[3].hand = [
        card("diamonds", 5),
        card("diamonds", 6),
        card("diamonds", 7),
        card("diamonds", 10),
      ];
      state.hands = [
        state.players[0].hand,
        state.players[1].hand,
        state.players[2].hand,
        state.players[3].hand,
      ];

      const result = executePassPhase(state);

      expect(result.error).toBeUndefined();
      // Player 0 should receive from player 1 (right of p0)
      const p0Hand = result.gameState.players[0].hand;
      const hasHeart5 = p0Hand.some((c) => c.suit === "hearts" && c.rank === 5);
      expect(hasHeart5).toBe(true);
    });

    it("handles pass across correctly", () => {
      const state = createTestGameState({
        passDirection: "across",
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
            cards: [card("diamonds", 5), card("diamonds", 6), card("diamonds", 7)],
          },
        ],
      });

      state.players[0].hand = [
        card("clubs", 5),
        card("clubs", 6),
        card("clubs", 7),
        card("clubs", 10),
      ];
      state.players[1].hand = [
        card("hearts", 5),
        card("hearts", 6),
        card("hearts", 7),
        card("hearts", 10),
      ];
      state.players[2].hand = [
        card("spades", 5),
        card("spades", 6),
        card("spades", 7),
        card("spades", 10),
      ];
      state.players[3].hand = [
        card("diamonds", 5),
        card("diamonds", 6),
        card("diamonds", 7),
        card("diamonds", 10),
      ];
      state.hands = [
        state.players[0].hand,
        state.players[1].hand,
        state.players[2].hand,
        state.players[3].hand,
      ];

      const result = executePassPhase(state);

      expect(result.error).toBeUndefined();
      // Player 0 should receive from player 2 (across from p0)
      const p0Hand = result.gameState.players[0].hand;
      const hasSpade5 = p0Hand.some((c) => c.suit === "spades" && c.rank === 5);
      expect(hasSpade5).toBe(true);
    });

    it("handles missing submissions", () => {
      const state = createTestGameState({
        passDirection: "left",
        passSubmissions: [
          {
            playerId: "p1",
            cards: [card("clubs", 5), card("clubs", 6), card("clubs", 7)],
          },
          // Missing p2, p3, p4
        ],
      });

      const result = executePassPhase(state);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("submitted");
    });

    it("preserves hand size after passing", () => {
      const state = createTestGameState({
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
            cards: [card("diamonds", 5), card("diamonds", 6), card("diamonds", 7)],
          },
        ],
      });

      // Each player has 13 cards initially
      state.players[0].hand = Array(13).fill(null).map((_, i) => card("clubs", (i + 2) as Card["rank"]));
      state.players[1].hand = Array(13).fill(null).map((_, i) => card("hearts", (i + 2) as Card["rank"]));
      state.players[2].hand = Array(13).fill(null).map((_, i) => card("spades", (i + 2) as Card["rank"]));
      state.players[3].hand = Array(13).fill(null).map((_, i) => card("diamonds", (i + 2) as Card["rank"]));
      state.hands = [
        state.players[0].hand,
        state.players[1].hand,
        state.players[2].hand,
        state.players[3].hand,
      ];

      const result = executePassPhase(state);

      // Each player should still have 13 cards
      result.gameState.players.forEach((player) => {
        expect(player.hand.length).toBe(13);
      });
    });
  });

  describe("getPassTargetIndex - edge cases", () => {
    it("wraps around correctly", () => {
      expect(getPassTargetIndex(3, "left")).toBe(0); // Player 3 passes left to 0
      expect(getPassTargetIndex(0, "right")).toBe(3); // Player 0 passes right to 3
    });

    it("handles across correctly", () => {
      expect(getPassTargetIndex(0, "across")).toBe(2);
      expect(getPassTargetIndex(1, "across")).toBe(3);
      expect(getPassTargetIndex(2, "across")).toBe(0);
      expect(getPassTargetIndex(3, "across")).toBe(1);
    });

    it("handles none direction", () => {
      expect(getPassTargetIndex(0, "none")).toBe(0);
      expect(getPassTargetIndex(2, "none")).toBe(2);
    });
  });
});
