import { describe, it, expect } from "vitest";
import {
  isTwoOfClubs,
  isHeart,
  isQueenOfSpades,
  isPenaltyCard,
  getLeadSuit,
  hasSuit,
  hasNonPenaltyCards,
  canPlayCard,
  getValidCards,
  getTrickWinner,
  calculateTrickPoints,
  shouldBreakHearts,
  isRoundComplete,
  checkShootingTheMoon,
  applyShootingTheMoon,
  getNextPlayerIndex,
  findPlayerWithTwoOfClubs,
  isFirstTrick,
} from "../rules";
import type { Card, GameState } from "../../types/game";

// Helper to create a test card
const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ suit, rank });

// Helper to create a basic game state for testing
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
  ...overrides,
});

describe("rules - card identification", () => {
  it("identifies two of clubs", () => {
    expect(isTwoOfClubs(card("clubs", 2))).toBe(true);
    expect(isTwoOfClubs(card("clubs", 3))).toBe(false);
    expect(isTwoOfClubs(card("spades", 2))).toBe(false);
  });

  it("identifies hearts", () => {
    expect(isHeart(card("hearts", 5))).toBe(true);
    expect(isHeart(card("spades", 5))).toBe(false);
  });

  it("identifies queen of spades", () => {
    expect(isQueenOfSpades(card("spades", 12))).toBe(true);
    expect(isQueenOfSpades(card("spades", 13))).toBe(false);
    expect(isQueenOfSpades(card("hearts", 12))).toBe(false);
  });

  it("identifies penalty cards", () => {
    expect(isPenaltyCard(card("hearts", 5))).toBe(true);
    expect(isPenaltyCard(card("spades", 12))).toBe(true);
    expect(isPenaltyCard(card("clubs", 10))).toBe(false);
    expect(isPenaltyCard(card("spades", 13))).toBe(false);
  });
});

describe("rules - suit operations", () => {
  it("gets lead suit from trick", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("clubs", 7) },
    ];
    expect(getLeadSuit(trick)).toBe("clubs");
    expect(getLeadSuit([])).toBe(null);
  });

  it("checks if hand has suit", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    expect(hasSuit(hand, "clubs")).toBe(true);
    expect(hasSuit(hand, "hearts")).toBe(true);
    expect(hasSuit(hand, "diamonds")).toBe(false);
  });

  it("checks if hand has non-penalty cards", () => {
    const allPenalty = [
      card("hearts", 5),
      card("spades", 12),
      card("hearts", 10),
    ];
    const hasSafe = [card("hearts", 5), card("clubs", 10)];
    expect(hasNonPenaltyCards(allPenalty)).toBe(false);
    expect(hasNonPenaltyCards(hasSafe)).toBe(true);
  });
});

describe("rules - canPlayCard", () => {
  it("validates 2 of clubs must lead first trick", () => {
    const hand = [card("clubs", 2), card("clubs", 5)];
    const trick: typeof GameState.prototype.currentTrick = [];

    const result = canPlayCard(card("clubs", 2), hand, trick, false, true);
    expect(result.valid).toBe(true);

    const badResult = canPlayCard(card("clubs", 5), hand, trick, false, true);
    expect(badResult.valid).toBe(false);
    expect(badResult.reason).toContain("2 of clubs");
  });

  it("prevents penalty cards in first trick", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 12)];
    const trick = [{ playerId: "p1", card: card("clubs", 2) }];

    const heartResult = canPlayCard(
      card("hearts", 7),
      hand,
      trick,
      false,
      true
    );
    expect(heartResult.valid).toBe(false);

    const queenResult = canPlayCard(
      card("spades", 12),
      hand,
      trick,
      false,
      true
    );
    expect(queenResult.valid).toBe(false);

    const safeResult = canPlayCard(card("clubs", 5), hand, trick, false, true);
    expect(safeResult.valid).toBe(true);
  });

  it("enforces follow suit rule", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    const trick = [{ playerId: "p1", card: card("clubs", 2) }];

    const followSuit = canPlayCard(card("clubs", 5), hand, trick, false, false);
    expect(followSuit.valid).toBe(true);

    const breakSuit = canPlayCard(card("hearts", 7), hand, trick, false, false);
    expect(breakSuit.valid).toBe(false);
    expect(breakSuit.reason).toContain("follow suit");
  });

  it("allows any card when cannot follow suit", () => {
    const hand = [card("hearts", 7), card("spades", 10)];
    const trick = [{ playerId: "p1", card: card("clubs", 2) }];

    const result = canPlayCard(card("hearts", 7), hand, trick, false, false);
    expect(result.valid).toBe(true);
  });

  it("prevents leading hearts before hearts broken", () => {
    const hand = [card("hearts", 7), card("clubs", 5)];
    const trick: typeof GameState.prototype.currentTrick = [];

    const result = canPlayCard(card("hearts", 7), hand, trick, false, false);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("broken");
  });

  it("allows leading hearts if only hearts remain", () => {
    const hand = [card("hearts", 7), card("hearts", 10)];
    const trick: typeof GameState.prototype.currentTrick = [];

    const result = canPlayCard(card("hearts", 7), hand, trick, false, false);
    expect(result.valid).toBe(true);
  });

  it("allows leading hearts after hearts broken", () => {
    const hand = [card("hearts", 7), card("clubs", 5)];
    const trick: typeof GameState.prototype.currentTrick = [];

    const result = canPlayCard(card("hearts", 7), hand, trick, true, false);
    expect(result.valid).toBe(true);
  });
});

describe("rules - getValidCards", () => {
  it("returns only valid cards", () => {
    const hand = [
      card("clubs", 2),
      card("clubs", 5),
      card("hearts", 7),
      card("spades", 10),
    ];
    const trick: typeof GameState.prototype.currentTrick = [];

    // First trick, must start with 2 of clubs
    const valid = getValidCards(hand, trick, false, true);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toEqual(card("clubs", 2));
  });

  it("returns cards matching lead suit", () => {
    const hand = [card("clubs", 5), card("clubs", 10), card("hearts", 7)];
    const trick = [{ playerId: "p1", card: card("clubs", 2) }];

    const valid = getValidCards(hand, trick, false, false);
    expect(valid).toHaveLength(2);
    expect(valid.every((c) => c.suit === "clubs")).toBe(true);
  });
});

describe("rules - trick winner", () => {
  it("determines trick winner by highest card of lead suit", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("clubs", 10) },
      { playerId: "p3", card: card("clubs", 7) },
      { playerId: "p4", card: card("hearts", 14) }, // Hearts don't matter
    ];

    expect(getTrickWinner(trick)).toBe(1); // Player 2 with 10 of clubs
  });

  it("ignores non-lead suits", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("spades", 14) }, // Ace doesn't win
      { playerId: "p3", card: card("clubs", 7) },
      { playerId: "p4", card: card("clubs", 3) },
    ];

    expect(getTrickWinner(trick)).toBe(2); // Player 3 with 7 of clubs
  });
});

describe("rules - calculateTrickPoints", () => {
  it("counts hearts as 1 point each", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("hearts", 7) },
      { playerId: "p3", card: card("hearts", 10) },
      { playerId: "p4", card: card("clubs", 3) },
    ];

    const points = calculateTrickPoints(trick);
    expect(points["p2"]).toBe(1);
    expect(points["p3"]).toBe(1);
    expect(points["p1"]).toBe(0);
  });

  it("counts queen of spades as 13 points", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 5) },
      { playerId: "p2", card: card("spades", 12) },
      { playerId: "p3", card: card("spades", 7) },
      { playerId: "p4", card: card("spades", 3) },
    ];

    const points = calculateTrickPoints(trick);
    expect(points["p2"]).toBe(13);
  });

  it("combines hearts and queen of spades", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 12) },
      { playerId: "p2", card: card("hearts", 7) },
      { playerId: "p3", card: card("hearts", 10) },
      { playerId: "p4", card: card("clubs", 3) },
    ];

    const points = calculateTrickPoints(trick);
    expect(points["p1"]).toBe(13);
    expect(points["p2"]).toBe(1);
    expect(points["p3"]).toBe(1);
  });
});

describe("rules - hearts broken", () => {
  it("breaks hearts when a heart is played", () => {
    expect(shouldBreakHearts(card("hearts", 5), false)).toBe(true);
    expect(shouldBreakHearts(card("clubs", 5), false)).toBe(false);
    expect(shouldBreakHearts(card("clubs", 5), true)).toBe(true);
  });
});

describe("rules - round complete", () => {
  it("detects when all players have no cards", () => {
    const state = createTestGameState();
    expect(isRoundComplete(state)).toBe(true);

    state.players[0].hand = [card("clubs", 5)];
    expect(isRoundComplete(state)).toBe(false);
  });
});

describe("rules - shooting the moon", () => {
  it("detects when a player took all 26 points", () => {
    const roundScores = [26, 0, 0, 0];
    const result = checkShootingTheMoon(roundScores);
    expect(result.shot).toBe(true);
    expect(result.playerIndex).toBe(0);
  });

  it("returns false when no moon shot", () => {
    const roundScores = [13, 13, 0, 0];
    const result = checkShootingTheMoon(roundScores);
    expect(result.shot).toBe(false);
  });

  it("applies moon shot scoring (0 for shooter, 26 for others)", () => {
    const roundScores = [26, 0, 0, 0];
    const adjusted = applyShootingTheMoon(roundScores, 0);
    expect(adjusted).toEqual([0, 26, 26, 26]);
  });
});

describe("rules - player navigation", () => {
  it("gets next player index in circular order", () => {
    expect(getNextPlayerIndex(0, 4)).toBe(1);
    expect(getNextPlayerIndex(1, 4)).toBe(2);
    expect(getNextPlayerIndex(2, 4)).toBe(3);
    expect(getNextPlayerIndex(3, 4)).toBe(0); // Wraps around
  });

  it("finds player with 2 of clubs", () => {
    const state = createTestGameState();
    state.players[0].hand = [card("clubs", 5)];
    state.players[1].hand = [card("clubs", 2), card("hearts", 7)];
    state.players[2].hand = [card("spades", 10)];
    state.players[3].hand = [card("diamonds", 3)];

    expect(findPlayerWithTwoOfClubs(state)).toBe(1);
  });
});

describe("rules - isFirstTrick", () => {
  it("returns true when all players have 13 cards", () => {
    const state = createTestGameState();
    state.players = state.players.map((p) => ({
      ...p,
      hand: Array(13).fill(card("clubs", 2)),
    }));

    expect(isFirstTrick(state)).toBe(true);
  });

  it("returns false after cards have been played", () => {
    const state = createTestGameState();
    state.players[0].hand = Array(12).fill(card("clubs", 2));
    state.players[1].hand = Array(13).fill(card("clubs", 2));
    state.players[2].hand = Array(13).fill(card("clubs", 2));
    state.players[3].hand = Array(13).fill(card("clubs", 2));

    expect(isFirstTrick(state)).toBe(false);
  });
});
