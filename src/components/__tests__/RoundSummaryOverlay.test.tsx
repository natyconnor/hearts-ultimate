import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { RoundSummaryOverlay } from "../RoundSummaryOverlay";
import { createTestPlayers, createCard } from "../../test/testUtils";
import type { Card } from "../../types/game";

// Mock the sound module
vi.mock("../../lib/sounds", () => ({
  playSound: vi.fn(),
}));

describe("RoundSummaryOverlay Component", () => {
  const defaultProps = {
    players: createTestPlayers(),
    roundNumber: 3,
    roundScores: [5, 12, 0, 9],
    totalScores: [25, 45, 30, 40],
    onNextRound: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders round complete header with round number", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);
      expect(screen.getByText("Round 3 Complete")).toBeInTheDocument();
    });

    it("displays all player names", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("You")).toBeInTheDocument();
      expect(screen.getByText("Bot Alice")).toBeInTheDocument();
      expect(screen.getByText("Bot Bob")).toBeInTheDocument();
      expect(screen.getByText("Bot Carol")).toBeInTheDocument();
    });

    it("shows column headers for Player, Round, and Total", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("Player")).toBeInTheDocument();
      expect(screen.getByText("Round")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
    });
  });

  describe("Score Display", () => {
    it("displays round scores with + prefix for positive", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("+5")).toBeInTheDocument();
      expect(screen.getByText("+12")).toBeInTheDocument();
      expect(screen.getByText("+9")).toBeInTheDocument();
    });

    it("displays 0 without prefix", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("displays total scores", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("40")).toBeInTheDocument();
    });
  });

  describe("AI Player Indicators", () => {
    it("shows robot emoji for AI players", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      // 3 AI players, may appear multiple times (in score table and cards taken)
      const robotEmojis = screen.getAllByText("🤖");
      expect(robotEmojis.length).toBeGreaterThanOrEqual(3);
    });

    it("shows difficulty badges", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getAllByText("🌱").length).toBeGreaterThanOrEqual(1); // Easy
      expect(screen.getAllByText("⚡").length).toBeGreaterThanOrEqual(1); // Medium
      expect(screen.getAllByText("🧠").length).toBeGreaterThanOrEqual(1); // Hard
    });
  });

  describe("Points Cards Taken Section", () => {
    it("displays cards taken by players", () => {
      const pointsCardsTaken: Card[][] = [
        [createCard("hearts", 5), createCard("hearts", 8)],
        [createCard("hearts", 3), createCard("spades", 12)],
        [],
        [createCard("hearts", 2)],
      ];

      render(
        <RoundSummaryOverlay
          {...defaultProps}
          pointsCardsTaken={pointsCardsTaken}
        />
      );

      expect(screen.getByText("Cards Taken")).toBeInTheDocument();
    });

    it("does not show cards taken section when no points cards", () => {
      const pointsCardsTaken: Card[][] = [[], [], [], []];

      render(
        <RoundSummaryOverlay
          {...defaultProps}
          pointsCardsTaken={pointsCardsTaken}
        />
      );

      expect(screen.queryByText("Cards Taken")).not.toBeInTheDocument();
    });

    it("only shows players who took cards", () => {
      const pointsCardsTaken: Card[][] = [
        [createCard("hearts", 5)],
        [],
        [],
        [],
      ];

      render(
        <RoundSummaryOverlay
          {...defaultProps}
          pointsCardsTaken={pointsCardsTaken}
        />
      );

      // Should show "You" in the cards taken section
      // But not other players who took nothing
    });
  });

  describe("Progress Indicator", () => {
    it("shows game progress bar", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("Game progress")).toBeInTheDocument();
      expect(screen.getByText("100 points to end")).toBeInTheDocument();
    });

    it("displays highest and lowest scores", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("Highest: 45 pts")).toBeInTheDocument();
      expect(screen.getByText("Lowest: 25 pts")).toBeInTheDocument();
    });
  });

  describe("Next Round Button", () => {
    it("renders Next Round button", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);
      expect(screen.getByText("Next Round")).toBeInTheDocument();
    });

    it("calls onNextRound when clicked", () => {
      const onNextRound = vi.fn();
      render(
        <RoundSummaryOverlay {...defaultProps} onNextRound={onNextRound} />
      );

      fireEvent.click(screen.getByText("Next Round"));
      expect(onNextRound).toHaveBeenCalledTimes(1);
    });

    it("shows loading state", () => {
      render(<RoundSummaryOverlay {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Dealing cards...")).toBeInTheDocument();
    });

    it("disables button when loading", () => {
      render(<RoundSummaryOverlay {...defaultProps} isLoading={true} />);

      const button = screen.getByText("Dealing cards...").closest("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Shoot The Moon", () => {
    it("displays moon celebration when someone shoots the moon", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          shotTheMoon={{ playerIndex: 1 }}
        />
      );

      expect(screen.getByText("SHOT THE MOON!")).toBeInTheDocument();
    });

    it("shows player name who shot the moon", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          shotTheMoon={{ playerIndex: 1 }}
        />
      );

      expect(
        screen.getByText("Bot Alice collected all 26 points!")
      ).toBeInTheDocument();
    });

    it("displays penalty for other players", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          shotTheMoon={{ playerIndex: 2 }}
        />
      );

      expect(
        screen.getByText("Everyone else gets +26 points")
      ).toBeInTheDocument();
    });

    it("does not show moon celebration when no one shot the moon", () => {
      render(<RoundSummaryOverlay {...defaultProps} shotTheMoon={null} />);
      expect(screen.queryByText("SHOT THE MOON!")).not.toBeInTheDocument();
    });
  });

  describe("Score Highlighting", () => {
    it("highlights worst round score (highest)", () => {
      const { container } = render(<RoundSummaryOverlay {...defaultProps} />);

      // Player with 12 points should have red background
      const redBg = container.querySelector(".bg-red-500\\/10");
      expect(redBg).toBeInTheDocument();
    });

    it("highlights best round score (lowest, but not when all same)", () => {
      const { container } = render(<RoundSummaryOverlay {...defaultProps} />);

      // Player with 0 points should have green background
      const greenBg = container.querySelector(".bg-green-500\\/10");
      expect(greenBg).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles all players with same score", () => {
      const props = {
        ...defaultProps,
        roundScores: [10, 10, 10, 10],
      };

      render(<RoundSummaryOverlay {...props} />);

      const plusTens = screen.getAllByText("+10");
      expect(plusTens).toHaveLength(4);
    });

    it("handles very high scores", () => {
      const props = {
        ...defaultProps,
        totalScores: [95, 98, 85, 92],
      };

      render(<RoundSummaryOverlay {...props} />);

      expect(screen.getByText("98")).toBeInTheDocument();
      expect(screen.getByText("Highest: 98 pts")).toBeInTheDocument();
    });

    it("handles round 1", () => {
      const props = {
        ...defaultProps,
        roundNumber: 1,
      };

      render(<RoundSummaryOverlay {...props} />);
      expect(screen.getByText("Round 1 Complete")).toBeInTheDocument();
    });
  });
});
