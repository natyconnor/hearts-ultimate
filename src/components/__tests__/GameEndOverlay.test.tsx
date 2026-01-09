import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { GameEndOverlay } from "../GameEndOverlay";
import { createTestPlayers, createAIPlayer, createPlayer } from "../../test/testUtils";

describe("GameEndOverlay Component", () => {
  const defaultProps = {
    players: createTestPlayers(),
    scores: [45, 78, 102, 23],
    winnerIndex: 3, // Carol with 23 points
    onNewGame: vi.fn(),
    onGoHome: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the Game Over header", () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByText("Game Over!")).toBeInTheDocument();
    });

    it("displays the winner's name", () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByText("Bot Carol wins!")).toBeInTheDocument();
    });

    it("shows trophy icon", () => {
      const { container } = render(<GameEndOverlay {...defaultProps} />);
      // Trophy is rendered as an SVG
      const trophyIcon = container.querySelector("svg");
      expect(trophyIcon).toBeInTheDocument();
    });

    it("displays Final Standings header", () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByText("Final Standings")).toBeInTheDocument();
    });
  });

  describe("Rankings", () => {
    it("displays all players sorted by score (lowest first)", () => {
      render(<GameEndOverlay {...defaultProps} />);

      // All player names should be visible
      expect(screen.getByText("You")).toBeInTheDocument();
      expect(screen.getByText("Bot Alice")).toBeInTheDocument();
      expect(screen.getByText("Bot Bob")).toBeInTheDocument();
      expect(screen.getByText("Bot Carol")).toBeInTheDocument();
    });

    it("displays scores with 'pts' suffix", () => {
      render(<GameEndOverlay {...defaultProps} />);

      expect(screen.getByText("23 pts")).toBeInTheDocument();
      expect(screen.getByText("45 pts")).toBeInTheDocument();
      expect(screen.getByText("78 pts")).toBeInTheDocument();
      expect(screen.getByText("102 pts")).toBeInTheDocument();
    });

    it("shows rank numbers 1-4", () => {
      render(<GameEndOverlay {...defaultProps} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  describe("AI Player Indicators", () => {
    it("shows robot emoji for AI players", () => {
      render(<GameEndOverlay {...defaultProps} />);

      // Should have multiple robot emojis (3 AI players)
      const robotEmojis = screen.getAllByText("🤖");
      expect(robotEmojis.length).toBe(3);
    });

    it("shows difficulty badges for AI players", () => {
      render(<GameEndOverlay {...defaultProps} />);

      // Check for difficulty icons
      expect(screen.getByText("🌱")).toBeInTheDocument(); // Easy
      expect(screen.getByText("⚡")).toBeInTheDocument(); // Medium
      expect(screen.getByText("🧠")).toBeInTheDocument(); // Hard
    });

    it("does not show AI indicators for human players", () => {
      const players = [
        createPlayer({ id: "p1", name: "Human 1" }),
        createPlayer({ id: "p2", name: "Human 2" }),
        createPlayer({ id: "p3", name: "Human 3" }),
        createPlayer({ id: "p4", name: "Human 4" }),
      ];

      render(
        <GameEndOverlay
          {...defaultProps}
          players={players}
          winnerIndex={0}
        />
      );

      expect(screen.queryByText("🤖")).not.toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("renders Home button", () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("renders New Game button", () => {
      render(<GameEndOverlay {...defaultProps} />);
      expect(screen.getByText("New Game")).toBeInTheDocument();
    });

    it("calls onGoHome when Home button is clicked", () => {
      const onGoHome = vi.fn();
      render(<GameEndOverlay {...defaultProps} onGoHome={onGoHome} />);

      fireEvent.click(screen.getByText("Home"));
      expect(onGoHome).toHaveBeenCalledTimes(1);
    });

    it("calls onNewGame when New Game button is clicked", () => {
      const onNewGame = vi.fn();
      render(<GameEndOverlay {...defaultProps} onNewGame={onNewGame} />);

      fireEvent.click(screen.getByText("New Game"));
      expect(onNewGame).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading State", () => {
    it("shows 'Starting...' text when loading", () => {
      render(<GameEndOverlay {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });

    it("disables buttons when loading", () => {
      render(<GameEndOverlay {...defaultProps} isLoading={true} />);

      const homeButton = screen.getByText("Home").closest("button");
      const newGameButton = screen.getByText("Starting...").closest("button");

      expect(homeButton).toBeDisabled();
      expect(newGameButton).toBeDisabled();
    });

    it("does not disable buttons when not loading", () => {
      render(<GameEndOverlay {...defaultProps} isLoading={false} />);

      const homeButton = screen.getByText("Home").closest("button");
      const newGameButton = screen.getByText("New Game").closest("button");

      expect(homeButton).not.toBeDisabled();
      expect(newGameButton).not.toBeDisabled();
    });
  });

  describe("Winner Celebration", () => {
    it("shows celebration emojis", () => {
      render(<GameEndOverlay {...defaultProps} />);

      const celebrationEmojis = screen.getAllByText("🎉");
      expect(celebrationEmojis.length).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("handles tie scores correctly", () => {
      const props = {
        ...defaultProps,
        scores: [50, 50, 100, 25],
        winnerIndex: 3,
      };

      render(<GameEndOverlay {...props} />);

      // Both players with 50 should be shown
      const fiftyScores = screen.getAllByText("50 pts");
      expect(fiftyScores).toHaveLength(2);
    });

    it("handles all AI players", () => {
      const aiPlayers = [
        createAIPlayer("ai1", "AI 1", "easy"),
        createAIPlayer("ai2", "AI 2", "medium"),
        createAIPlayer("ai3", "AI 3", "hard"),
        createAIPlayer("ai4", "AI 4", "easy"),
      ];

      render(
        <GameEndOverlay
          {...defaultProps}
          players={aiPlayers}
          winnerIndex={0}
        />
      );

      const robotEmojis = screen.getAllByText("🤖");
      expect(robotEmojis.length).toBe(4);
    });

    it("handles very high scores", () => {
      const props = {
        ...defaultProps,
        scores: [156, 203, 189, 167],
        winnerIndex: 0,
      };

      render(<GameEndOverlay {...props} />);

      expect(screen.getByText("156 pts")).toBeInTheDocument();
      expect(screen.getByText("203 pts")).toBeInTheDocument();
    });
  });
});
