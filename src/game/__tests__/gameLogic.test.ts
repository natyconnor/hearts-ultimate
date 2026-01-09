import { describe, it, expect } from "vitest";
import {
  playCard,
  initializeRound,
  startRoundWithPassingPhase,
  prepareNewRound,
  resetGameForNewGame,
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

describe("gameLogic - playCard", () => {
  it("adds card to trick and moves to next player", () => {
    const state = createTestGameState();
    state.players[0].hand = [card("clubs", 2), card("clubs", 5)];
    state.hands[0] = state.players[0].hand;

    const result = playCard(state, "p1", card("clubs", 2));

    expect(result.error).toBeUndefined();
    expect(result.gameState.currentTrick).toHaveLength(1);
    expect(result.gameState.currentTrick[0].card).toEqual(card("clubs", 2));
    expect(result.gameState.currentPlayerIndex).toBe(1);
    expect(result.gameState.players[0].hand).toHaveLength(1);
  });

  it("prevents playing out of turn", () => {
    const state = createTestGameState({ currentPlayerIndex: 1 });
    state.players[0].hand = [card("clubs", 2)];

    const result = playCard(state, "p1", card("clubs", 2));

    expect(result.error).toBe("Not your turn");
  });

  it("validates card can be played", () => {
    const state = createTestGameState({ currentPlayerIndex: 0 });
    state.players[0].hand = [card("hearts", 7), card("clubs", 5)];
    state.currentTrick = []; // Leading

    // Can't lead hearts before broken
    const result = playCard(state, "p1", card("hearts", 7));
    expect(result.error).toBeDefined();
  });

  it("breaks hearts when a heart is played", () => {
    const state = createTestGameState({
      currentPlayerIndex: 1,
      currentTrickNumber: 2, // Not first trick - hearts can be played
    });
    state.players[0].hand = [card("clubs", 2)];
    state.players[1].hand = [card("hearts", 7)];
    state.currentTrick = [{ playerId: "p1", card: card("clubs", 2) }];

    const result = playCard(state, "p2", card("hearts", 7));

    expect(result.error).toBeUndefined();
    expect(result.gameState.heartsBroken).toBe(true);
  });

  it("completes trick when 4 cards played", () => {
    const state = createTestGameState({ currentPlayerIndex: 3 });
    state.currentTrick = [
      { playerId: "p1", card: card("clubs", 2) },
      { playerId: "p2", card: card("clubs", 5) },
      { playerId: "p3", card: card("clubs", 10) },
    ];
    state.players[3].hand = [card("clubs", 7)];
    state.hands[3] = [card("clubs", 7)];
    // Ensure other players have cards (not round complete)
    state.players[0].hand = [card("hearts", 5)];
    state.players[1].hand = [card("hearts", 6)];
    state.players[2].hand = [card("hearts", 7)];
    state.hands[0] = [card("hearts", 5)];
    state.hands[1] = [card("hearts", 6)];
    state.hands[2] = [card("hearts", 7)];

    const result = playCard(state, "p4", card("clubs", 7));

    expect(result.error).toBeUndefined();
    // Trick complete, so currentTrick is cleared and saved to lastCompletedTrick
    expect(result.gameState.currentTrick).toHaveLength(0);
    expect(result.gameState.lastCompletedTrick).toHaveLength(4);
    // Winner is player 2 (index 2) with 10 of clubs
    expect(result.gameState.lastTrickWinnerIndex).toBe(2);
    // Next player should be the winner
    expect(result.gameState.currentPlayerIndex).toBe(2);
  });

  it("calculates round scores correctly", () => {
    const state = createTestGameState({
      currentPlayerIndex: 3,
      roundScores: [0, 0, 0, 0],
      currentTrickNumber: 2, // Not first trick - penalty cards allowed
    });
    state.currentTrick = [
      { playerId: "p1", card: card("hearts", 5) }, // 1 point
      { playerId: "p2", card: card("hearts", 7) }, // 1 point
      { playerId: "p3", card: card("spades", 12) }, // 13 points (Q♠)
    ];
    state.players[3].hand = [card("hearts", 10)];
    state.hands[3] = [card("hearts", 10)];
    // Ensure other players have cards (not round complete)
    state.players[0].hand = [card("clubs", 5)];
    state.players[1].hand = [card("clubs", 6)];
    state.players[2].hand = [card("clubs", 7)];
    state.hands[0] = [card("clubs", 5)];
    state.hands[1] = [card("clubs", 6)];
    state.hands[2] = [card("clubs", 7)];

    const result = playCard(state, "p4", card("hearts", 10));

    // All points go to the trick winner (p4 with hearts 10, highest heart)
    // Hearts (1+1+1) + Queen of Spades (13) = 16 points total
    expect(result.gameState.roundScores[0]).toBe(0);
    expect(result.gameState.roundScores[1]).toBe(0);
    expect(result.gameState.roundScores[2]).toBe(0);
    expect(result.gameState.roundScores[3]).toBe(16);
  });

  it("detects round complete and updates total scores", () => {
    const state = createTestGameState({
      currentPlayerIndex: 3,
      scores: [10, 20, 30, 40],
      roundScores: [5, 5, 10, 6],
    });
    // All players have only 1 card left
    state.players[0].hand = [];
    state.players[1].hand = [];
    state.players[2].hand = [];
    state.players[3].hand = [card("clubs", 7)]; // Last card
    state.currentTrick = [
      { playerId: "p1", card: card("clubs", 2) },
      { playerId: "p2", card: card("clubs", 5) },
      { playerId: "p3", card: card("clubs", 10) },
    ];

    const result = playCard(state, "p4", card("clubs", 7));

    expect(result.gameState.isRoundComplete).toBe(true);
    // Total scores should be updated
    expect(result.gameState.scores[0]).toBe(15); // 10 + 5
    expect(result.gameState.scores[1]).toBe(25); // 20 + 5
    expect(result.gameState.scores[2]).toBe(40); // 30 + 10
    expect(result.gameState.scores[3]).toBe(46); // 40 + 6
  });

  it("detects game over when score >= 100", () => {
    const state = createTestGameState({
      currentPlayerIndex: 3,
      scores: [95, 80, 70, 60],
      roundScores: [10, 5, 3, 8],
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
    expect(result.gameState.scores[0]).toBe(105); // Over 100
    // Winner is player with lowest score
    expect(result.gameState.winnerIndex).toBe(3); // Player 4 with 68
  });

  it("applies shooting the moon correctly", () => {
    const state = createTestGameState({
      currentPlayerIndex: 3,
      scores: [0, 0, 0, 0],
      roundScores: [26, 0, 0, 0], // Player 1 about to win all 26 points
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

    // Moon shooter gets 0, others get 26
    expect(result.gameState.roundScores[0]).toBe(0);
    expect(result.gameState.roundScores[1]).toBe(26);
    expect(result.gameState.roundScores[2]).toBe(26);
    expect(result.gameState.roundScores[3]).toBe(26);
  });
});

describe("gameLogic - round initialization", () => {
  it("initializes round with player who has 2 of clubs", () => {
    const state = createTestGameState();
    state.players[2].hand = [card("clubs", 2), card("hearts", 7)];

    const result = initializeRound(state);

    expect(result.currentPlayerIndex).toBe(2);
    expect(result.roundScores).toEqual([0, 0, 0, 0]);
    expect(result.heartsBroken).toBe(false);
    expect(result.currentTrick).toHaveLength(0);
  });

  it("starts with passing phase when direction is not none", () => {
    const state = createTestGameState();
    const newHands = [
      Array(13).fill(card("clubs", 2)),
      Array(13).fill(card("hearts", 2)),
      Array(13).fill(card("spades", 2)),
      Array(13).fill(card("diamonds", 2)),
    ];

    const result = startRoundWithPassingPhase(state, newHands);

    expect(result.isPassingPhase).toBe(true);
    expect(result.passDirection).toBe("left"); // Round 1
    expect(result.passSubmissions).toEqual([]);
  });

  it("skips passing phase when direction is none", () => {
    const state = createTestGameState({ roundNumber: 4 }); // Round 4 = no passing
    state.players[0].hand = [card("clubs", 2)]; // Has 2 of clubs
    const newHands = [
      [card("clubs", 2)],
      Array(13).fill(card("hearts", 2)),
      Array(13).fill(card("spades", 2)),
      Array(13).fill(card("diamonds", 2)),
    ];

    const result = startRoundWithPassingPhase(state, newHands);

    expect(result.isPassingPhase).toBe(false);
    expect(result.passDirection).toBe("none");
    expect(result.currentPlayerIndex).toBe(0); // Ready to play
  });
});

describe("gameLogic - prepareNewRound", () => {
  it("increments round number and resets scores", () => {
    const state = createTestGameState({
      roundNumber: 1,
      roundScores: [10, 5, 8, 3],
      scores: [10, 5, 8, 3],
    });
    state.players[0].hand = [card("clubs", 2)];
    const newHands = [[card("clubs", 2)], [], [], []];

    const result = prepareNewRound(state, newHands);

    expect(result.roundNumber).toBe(2);
    expect(result.roundScores).toEqual([0, 0, 0, 0]);
    expect(result.passDirection).toBe("right"); // Round 2
    expect(result.scores).toEqual([10, 5, 8, 3]); // Total scores preserved
  });
});

describe("gameLogic - resetGameForNewGame", () => {
  it("resets all scores and starts from round 1", () => {
    const state = createTestGameState({
      roundNumber: 5,
      scores: [50, 60, 70, 80],
      roundScores: [10, 5, 8, 3],
    });
    state.players[0].hand = [card("clubs", 2)];
    const newHands = [[card("clubs", 2)], [], [], []];

    const result = resetGameForNewGame(state, newHands);

    expect(result.roundNumber).toBe(1);
    expect(result.scores).toEqual([0, 0, 0, 0]);
    expect(result.roundScores).toEqual([0, 0, 0, 0]);
    expect(result.passDirection).toBe("left"); // Round 1
    expect(result.isGameOver).toBe(false);
  });
});
