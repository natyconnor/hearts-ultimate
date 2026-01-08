import { describe, it, expect } from "vitest";
import { chooseAICardsToPass, chooseAICard } from "../ai";
import type { Card, GameState } from "../../types/game";

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ suit, rank });

const createTestGameState = (
  hand: Card[],
  overrides?: Partial<GameState>
): GameState => ({
  players: [
    {
      id: "p1",
      name: "Player 1",
      isAI: true,
      difficulty: "easy",
      hand,
      score: 0,
    },
    {
      id: "p2",
      name: "Player 2",
      isAI: true,
      difficulty: "easy",
      hand: [],
      score: 0,
    },
    {
      id: "p3",
      name: "Player 3",
      isAI: true,
      difficulty: "easy",
      hand: [],
      score: 0,
    },
    {
      id: "p4",
      name: "Player 4",
      isAI: true,
      difficulty: "easy",
      hand: [],
      score: 0,
    },
  ],
  hands: [hand, [], [], []],
  currentTrick: [],
  scores: [0, 0, 0, 0],
  roundScores: [0, 0, 0, 0],
  heartsBroken: false,
  roundNumber: 1,
  currentPlayerIndex: 0,
  passDirection: "left",
  ...overrides,
});

describe("AI Module - chooseAICardsToPass", () => {
  it("returns exactly 3 cards", () => {
    const hand = Array(13)
      .fill(null)
      .map((_, i) => card("clubs", (i + 2) as Card["rank"]));
    const gameState = createTestGameState(hand);

    const result = chooseAICardsToPass(hand, gameState, 0);
    expect(result).toHaveLength(3);
  });

  it("prioritizes passing queen of spades", () => {
    const hand = [
      card("clubs", 2),
      card("clubs", 3),
      card("clubs", 4),
      card("spades", 12), // Queen of spades
      card("hearts", 5),
      ...Array(8).fill(card("diamonds", 2)),
    ];
    const gameState = createTestGameState(hand);

    const result = chooseAICardsToPass(hand, gameState, 0);

    // Should include queen of spades
    expect(result.some((c) => c.suit === "spades" && c.rank === 12)).toBe(true);
  });

  it("prefers passing high hearts", () => {
    const hand = [
      card("clubs", 2),
      card("clubs", 3),
      card("hearts", 14), // Ace of hearts - very bad
      card("hearts", 13), // King of hearts - bad
      card("hearts", 3), // Low heart
      ...Array(8).fill(card("diamonds", 5)),
    ];
    const gameState = createTestGameState(hand);

    const result = chooseAICardsToPass(hand, gameState, 0);

    // Should pass high hearts (14 and 13) - AI prioritizes high cards
    // The AI will pass the 3 highest scored cards, which includes high hearts and diamonds
    const passedHearts = result.filter((c) => c.suit === "hearts");
    // At minimum, should pass the ace of hearts (highest penalty)
    expect(passedHearts.some((c) => c.rank === 14)).toBe(true);
  });
});

describe("AI Module - chooseAICard", () => {
  it("follows suit when possible", () => {
    const hand = [card("clubs", 5), card("clubs", 10), card("hearts", 7)];
    const state = createTestGameState(hand, {
      currentTrick: [{ playerId: "p2", card: card("clubs", 2) }],
    });

    const chosen = chooseAICard(state, 0);

    expect(chosen.suit).toBe("clubs");
  });

  it("plays lowest card of lead suit", () => {
    const hand = [
      card("clubs", 10),
      card("clubs", 5), // Lowest
      card("clubs", 7),
      card("hearts", 7),
    ];
    const state = createTestGameState(hand, {
      currentTrick: [{ playerId: "p2", card: card("clubs", 2) }],
    });

    const chosen = chooseAICard(state, 0);

    expect(chosen).toEqual(card("clubs", 5));
  });

  it("plays any valid card when cannot follow suit", () => {
    const hand = [card("hearts", 7), card("hearts", 10), card("spades", 5)];
    const state = createTestGameState(hand, {
      currentTrick: [{ playerId: "p2", card: card("clubs", 2) }],
    });

    const chosen = chooseAICard(state, 0);

    // Should play any valid card (all are valid when can't follow suit)
    expect(hand).toContainEqual(chosen);
  });

  it("leads with a random suit when leading", () => {
    const hand = [card("clubs", 5), card("hearts", 7), card("spades", 10)];
    const state = createTestGameState(hand, {
      currentTrick: [],
      heartsBroken: true, // Allow leading hearts
    });

    const chosen = chooseAICard(state, 0);

    // Should be one of the cards in hand
    expect(hand).toContainEqual(chosen);
  });

  it("respects first trick restrictions", () => {
    const hand = [card("clubs", 2), ...Array(12).fill(card("hearts", 7))];
    const state = createTestGameState(hand, {
      currentTrick: [],
    });
    // All players have 13 cards = first trick
    state.players = state.players.map((p, idx) => ({
      ...p,
      hand: idx === 0 ? hand : Array(13).fill(card("clubs", 3)),
    }));

    const chosen = chooseAICard(state, 0);

    // Must play 2 of clubs on first trick
    expect(chosen.suit).toBe("clubs");
    expect(chosen.rank).toBe(2);
  });
});
