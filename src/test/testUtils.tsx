import { render, RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Card, CardSuit, CardRank, Player, GameState, AIDifficulty } from "../types/game";

// Custom render wrapper (can be extended with providers if needed)
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Test data factories
export function createCard(
  suit: CardSuit,
  rank: CardRank,
  points?: number
): Card {
  const defaultPoints =
    suit === "hearts" ? 1 : suit === "spades" && rank === 12 ? 13 : 0;
  return {
    suit,
    rank,
    points: points ?? defaultPoints,
  };
}

export function createPlayer(
  overrides: Partial<Player> & { id: string; name: string }
): Player {
  return {
    isAI: false,
    hand: [],
    score: 0,
    ...overrides,
  };
}

export function createAIPlayer(
  id: string,
  name: string,
  difficulty: AIDifficulty = "medium"
): Player {
  return {
    id,
    name,
    isAI: true,
    difficulty,
    hand: [],
    score: 0,
  };
}

// Create a full hand of 13 cards (Hearts standard)
export function createFullHand(): Card[] {
  const suits: CardSuit[] = ["clubs", "diamonds", "hearts", "spades"];
  const hand: Card[] = [];

  // Mix of cards from different suits
  for (let i = 0; i < 13; i++) {
    const suit = suits[i % 4];
    const rank = (2 + i) as CardRank;
    hand.push(createCard(suit, rank));
  }
  return hand;
}

// Create specific hands for testing
export function createHeartHand(): Card[] {
  const ranks: CardRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  return ranks.map((rank) => createCard("hearts", rank));
}

export function createMixedHand(): Card[] {
  return [
    createCard("clubs", 2),
    createCard("clubs", 5),
    createCard("clubs", 10),
    createCard("diamonds", 3),
    createCard("diamonds", 7),
    createCard("diamonds", 14),
    createCard("hearts", 4),
    createCard("hearts", 8),
    createCard("hearts", 12),
    createCard("spades", 6),
    createCard("spades", 9),
    createCard("spades", 12), // Queen of Spades!
    createCard("spades", 14),
  ];
}

// Create 4 test players
export function createTestPlayers(): Player[] {
  return [
    createPlayer({ id: "player-0", name: "You" }),
    createAIPlayer("player-1", "Bot Alice", "easy"),
    createAIPlayer("player-2", "Bot Bob", "medium"),
    createAIPlayer("player-3", "Bot Carol", "hard"),
  ];
}

// Create a basic game state
export function createTestGameState(
  overrides: Partial<GameState> = {}
): GameState {
  const players = createTestPlayers();
  return {
    players,
    hands: players.map(() => createFullHand()),
    currentTrick: [],
    scores: [0, 0, 0, 0],
    roundScores: [0, 0, 0, 0],
    heartsBroken: false,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    trickLeaderIndex: 0,
    roundNumber: 1,
    currentTrickNumber: 1,
    passDirection: "left",
    isPassingPhase: false,
    ...overrides,
  };
}
