import { describe, it, expect } from "vitest";
import {
  getPassDirection,
  getPassTargetIndex,
  getPassDirectionLabel,
  getPassDirectionEmoji,
  validatePassSelection,
  isCardSelected,
  allPlayersHavePassed,
  hasPlayerSubmittedPass,
  submitPassSelection,
  executePassPhase,
  processAIPasses,
  processAIPassesAndFinalize,
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

describe("passingLogic - pass direction", () => {
  it("rotates pass direction every round", () => {
    expect(getPassDirection(1)).toBe("left");
    expect(getPassDirection(2)).toBe("right");
    expect(getPassDirection(3)).toBe("across");
    expect(getPassDirection(4)).toBe("none");
    expect(getPassDirection(5)).toBe("left"); // Repeats
  });

  it("gets correct pass target index", () => {
    expect(getPassTargetIndex(0, "left")).toBe(1);
    expect(getPassTargetIndex(0, "right")).toBe(3);
    expect(getPassTargetIndex(0, "across")).toBe(2);
    expect(getPassTargetIndex(0, "none")).toBe(0);
  });

  it("wraps around for all players", () => {
    expect(getPassTargetIndex(3, "left")).toBe(0);
    expect(getPassTargetIndex(0, "right")).toBe(3);
  });

  it("returns correct labels", () => {
    expect(getPassDirectionLabel("left")).toBe("Pass Left");
    expect(getPassDirectionLabel("right")).toBe("Pass Right");
    expect(getPassDirectionLabel("across")).toBe("Pass Across");
    expect(getPassDirectionLabel("none")).toBe("Hold (No Passing)");
  });

  it("returns correct emojis", () => {
    expect(getPassDirectionEmoji("left")).toBe("⬅️");
    expect(getPassDirectionEmoji("right")).toBe("➡️");
    expect(getPassDirectionEmoji("across")).toBe("⬆️");
    expect(getPassDirectionEmoji("none")).toBe("✋");
  });
});

describe("passingLogic - validatePassSelection", () => {
  it("requires exactly 3 cards", () => {
    const hand = [card("clubs", 5), card("hearts", 7)];
    const result = validatePassSelection([card("clubs", 5)], hand);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("3 cards");
  });

  it("validates cards are in hand", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    const selected = [
      card("clubs", 5),
      card("hearts", 7),
      card("diamonds", 3), // Not in hand
    ];
    const result = validatePassSelection(selected, hand);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not in hand");
  });

  it("prevents duplicate cards", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    const selected = [card("clubs", 5), card("clubs", 5), card("hearts", 7)];
    const result = validatePassSelection(selected, hand);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("duplicate");
  });

  it("accepts valid selection", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    const selected = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    const result = validatePassSelection(selected, hand);
    expect(result.valid).toBe(true);
  });
});

describe("passingLogic - submitPassSelection", () => {
  it("records pass submission", () => {
    const state = createTestGameState({
      isPassingPhase: true,
      passDirection: "left",
      passSubmissions: [],
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

    expect(result.error).toBeUndefined();
    expect(result.gameState.passSubmissions).toHaveLength(1);
    expect(result.gameState.passSubmissions![0].playerId).toBe("p1");
  });

  it("prevents duplicate submission", () => {
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

    const result = submitPassSelection(state, "p1", [
      card("clubs", 5),
      card("hearts", 7),
      card("spades", 10),
    ]);

    expect(result.error).toBe("Already submitted pass selection");
  });
});

describe("passingLogic - executePassPhase", () => {
  it("swaps cards between players (pass left)", () => {
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
          cards: [
            card("diamonds", 5),
            card("diamonds", 6),
            card("diamonds", 7),
          ],
        },
      ],
    });

    // Set initial hands (must include the cards being passed)
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

    const result = executePassPhase(state);

    expect(result.error).toBeUndefined();
    expect(result.gameState.isPassingPhase).toBe(false);
    expect(result.gameState.isRevealPhase).toBe(true);

    // Player 0 passed clubs to player 1, so player 0 receives diamonds from player 3
    const p0Hand = result.gameState.players[0].hand;
    const hasDiamond5 = p0Hand.some(
      (c) => c.suit === "diamonds" && c.rank === 5
    );
    const hasClub5 = p0Hand.some((c) => c.suit === "clubs" && c.rank === 5);
    expect(hasDiamond5).toBe(true);
    expect(hasClub5).toBe(false);
  });
});

describe("passingLogic - processAIPasses", () => {
  it("processes all AI player passes", () => {
    const state = createTestGameState({
      isPassingPhase: true,
      passDirection: "left",
      passSubmissions: [],
    });

    state.players[0].isAI = true;
    state.players[0].hand = Array(13)
      .fill(null)
      .map((_, i) => card("clubs", (i + 2) as Card["rank"]));
    state.players[1].isAI = true;
    state.players[1].hand = Array(13)
      .fill(null)
      .map((_, i) => card("hearts", (i + 2) as Card["rank"]));
    state.players[2].isAI = false;
    state.players[3].isAI = false;

    const mockChooser = (hand: Card[]) => hand.slice(0, 3);
    const result = processAIPasses(state, mockChooser);

    expect(result.passSubmissions).toHaveLength(2); // Only AI players
    expect(hasPlayerSubmittedPass(result, "p1")).toBe(true);
    expect(hasPlayerSubmittedPass(result, "p2")).toBe(true);
    expect(hasPlayerSubmittedPass(result, "p3")).toBe(false);
  });

  it("processAIPassesAndFinalize completes passing when all pass", () => {
    const state = createTestGameState({
      isPassingPhase: true,
      passDirection: "left",
      passSubmissions: [],
    });

    // All AI players
    state.players = state.players.map((p, i) => ({
      ...p,
      isAI: true,
      hand: Array(13)
        .fill(null)
        .map((_, j) => card("clubs", (((j + 2 + i) % 13) + 2) as Card["rank"])),
    }));
    state.players[0].hand[0] = card("clubs", 2); // Ensure someone has 2 of clubs

    const mockChooser = (hand: Card[]) => hand.slice(0, 3);
    const mockFinalize = (s: GameState) => ({
      ...s,
      isPassingPhase: false,
      isRevealPhase: false,
    });

    const result = processAIPassesAndFinalize(state, mockChooser, mockFinalize);

    expect(result.isPassingPhase).toBe(false);
    expect(result.isRevealPhase).toBe(false);
  });
});

describe("passingLogic - helpers", () => {
  it("checks if card is selected", () => {
    const selected = [card("clubs", 5), card("hearts", 7)];
    expect(isCardSelected(card("clubs", 5), selected)).toBe(true);
    expect(isCardSelected(card("spades", 10), selected)).toBe(false);
  });

  it("checks if all players have passed", () => {
    const state = createTestGameState({ passSubmissions: [] });
    expect(allPlayersHavePassed(state)).toBe(false);

    state.passSubmissions = [
      { playerId: "p1", cards: [] },
      { playerId: "p2", cards: [] },
      { playerId: "p3", cards: [] },
      { playerId: "p4", cards: [] },
    ];
    expect(allPlayersHavePassed(state)).toBe(true);
  });
});
