import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrickArea } from "../TrickArea";
import type { Player, GameState, Card } from "../../types/game";

const createMockPlayer = (
  id: string,
  name: string,
  overrides: Partial<Player> = {}
): Player => ({
  id,
  name,
  isAI: false,
  hand: [],
  score: 0,
  ...overrides,
});

const createMockGameState = (
  overrides: Partial<GameState> = {}
): GameState => ({
  players: [
    createMockPlayer("p1", "Player 1"),
    createMockPlayer("p2", "Player 2"),
    createMockPlayer("p3", "Player 3"),
    createMockPlayer("p4", "Player 4"),
  ],
  currentTrick: [],
  scores: [0, 0, 0, 0],
  roundScores: [0, 0, 0, 0],
  heartsBroken: false,
  currentPlayerIndex: 0,
  roundNumber: 1,
  passDirection: "left",
  ...overrides,
});

describe("TrickArea", () => {
  it("renders without crashing", () => {
    const players = [
      createMockPlayer("p1", "Player 1"),
      createMockPlayer("p2", "Player 2"),
      createMockPlayer("p3", "Player 3"),
      createMockPlayer("p4", "Player 4"),
    ];

    const { container } = render(
      <TrickArea
        displayTrick={[]}
        players={players}
        gameState={null}
        myGameIndex={0}
        isShowingCompletedTrick={false}
        animatingToWinner={false}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it("renders trick cards", () => {
    const players = [
      createMockPlayer("p1", "Player 1"),
      createMockPlayer("p2", "Player 2"),
      createMockPlayer("p3", "Player 3"),
      createMockPlayer("p4", "Player 4"),
    ];

    const displayTrick: Array<{ playerId: string; card: Card }> = [
      { playerId: "p1", card: { suit: "spades", rank: "A" } },
      { playerId: "p2", card: { suit: "hearts", rank: "K" } },
    ];

    render(
      <TrickArea
        displayTrick={displayTrick}
        players={players}
        gameState={createMockGameState()}
        myGameIndex={0}
        isShowingCompletedTrick={false}
        animatingToWinner={false}
      />
    );

    // Cards should be rendered (they appear with their ranks - shown twice per card for top-left and bottom-right)
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("K").length).toBeGreaterThanOrEqual(1);
  });

  it("shows winner announcement when trick is completed", () => {
    const players = [
      createMockPlayer("p1", "Alice"),
      createMockPlayer("p2", "Bob"),
      createMockPlayer("p3", "Charlie"),
      createMockPlayer("p4", "Diana"),
    ];

    const displayTrick: Array<{ playerId: string; card: Card }> = [
      { playerId: "p1", card: { suit: "spades", rank: "A" } },
      { playerId: "p2", card: { suit: "spades", rank: "K" } },
      { playerId: "p3", card: { suit: "spades", rank: "Q" } },
      { playerId: "p4", card: { suit: "spades", rank: "J" } },
    ];

    const gameState = createMockGameState({
      players,
      lastTrickWinnerIndex: 1,
    });

    render(
      <TrickArea
        displayTrick={displayTrick}
        players={players}
        gameState={gameState}
        myGameIndex={0}
        isShowingCompletedTrick={true}
        animatingToWinner={false}
      />
    );

    expect(screen.getByText(/Bob wins!/)).toBeInTheDocument();
  });

  it("shows 'You win!' when current player wins", () => {
    const players = [
      createMockPlayer("p1", "Alice"),
      createMockPlayer("p2", "Bob"),
      createMockPlayer("p3", "Charlie"),
      createMockPlayer("p4", "Diana"),
    ];

    const displayTrick: Array<{ playerId: string; card: Card }> = [
      { playerId: "p1", card: { suit: "spades", rank: "A" } },
    ];

    const gameState = createMockGameState({
      players,
      lastTrickWinnerIndex: 0,
    });

    render(
      <TrickArea
        displayTrick={displayTrick}
        players={players}
        gameState={gameState}
        myGameIndex={0}
        isShowingCompletedTrick={true}
        animatingToWinner={false}
      />
    );

    expect(screen.getByText(/You win!/)).toBeInTheDocument();
  });

  it("does not show winner announcement when not showing completed trick", () => {
    const players = [
      createMockPlayer("p1", "Alice"),
      createMockPlayer("p2", "Bob"),
      createMockPlayer("p3", "Charlie"),
      createMockPlayer("p4", "Diana"),
    ];

    const displayTrick: Array<{ playerId: string; card: Card }> = [
      { playerId: "p1", card: { suit: "spades", rank: "A" } },
    ];

    const gameState = createMockGameState({
      players,
      lastTrickWinnerIndex: 1,
    });

    render(
      <TrickArea
        displayTrick={displayTrick}
        players={players}
        gameState={gameState}
        myGameIndex={0}
        isShowingCompletedTrick={false}
        animatingToWinner={false}
      />
    );

    expect(screen.queryByText(/wins!/)).not.toBeInTheDocument();
  });
});
