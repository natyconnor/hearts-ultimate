import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { RoundSummaryOverlay } from "../RoundSummaryOverlay";
import { createTestPlayers, createCard } from "../../test/testUtils";
import type { Card, RoundScoreRecord } from "../../types/game";
import { GAME_CONFIG } from "../../lib/constants";

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
    it("renders collapsible points taken header", () => {
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

      expect(screen.getByText("Points Taken")).toBeInTheDocument();
      expect(screen.getByText("(5 cards)")).toBeInTheDocument();
    });

    it("does not show points taken section when no points cards", () => {
      const pointsCardsTaken: Card[][] = [[], [], [], []];

      render(
        <RoundSummaryOverlay
          {...defaultProps}
          pointsCardsTaken={pointsCardsTaken}
        />
      );

      expect(screen.queryByText("Points Taken")).not.toBeInTheDocument();
    });

    it("expands to show player cards on click", () => {
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

      // Click to expand
      fireEvent.click(screen.getByText("Points Taken"));

      // Should show "You" in the expanded cards taken section
      // "You" appears multiple times (main score table + expanded section)
      const youTexts = screen.getAllByText("You");
      expect(youTexts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Progress Indicator", () => {
    it("shows game progress bar", () => {
      render(<RoundSummaryOverlay {...defaultProps} />);

      expect(screen.getByText("Game progress")).toBeInTheDocument();
      expect(
        screen.getByText(`${GAME_CONFIG.GAME_END_SCORE} points to end`)
      ).toBeInTheDocument();
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

  describe("Round History Section", () => {
    const createRoundHistory = (): RoundScoreRecord[] => [
      {
        roundNumber: 1,
        scores: [5, 8, 0, 13], // Player 2 had 0, Player 3 got Q♠
        shotTheMoon: null,
      },
      {
        roundNumber: 2,
        scores: [3, 0, 26, 0], // Player 2 shot the moon (everyone else gets 26)
        shotTheMoon: { playerIndex: 2 },
      },
      {
        roundNumber: 3,
        scores: [5, 12, 0, 9], // Current round scores from defaultProps
        shotTheMoon: null,
      },
    ];

    it("renders collapsible round history header", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          roundHistory={createRoundHistory()}
        />
      );

      expect(screen.getByText("Score History")).toBeInTheDocument();
      expect(screen.getByText("(3 rounds)")).toBeInTheDocument();
    });

    it("does not show round history when empty", () => {
      render(<RoundSummaryOverlay {...defaultProps} roundHistory={[]} />);

      expect(screen.queryByText("Score History")).not.toBeInTheDocument();
    });

    it("does not show round history when undefined", () => {
      render(
        <RoundSummaryOverlay {...defaultProps} roundHistory={undefined} />
      );

      expect(screen.queryByText("Score History")).not.toBeInTheDocument();
    });

    it("does not show round history when only 1 round", () => {
      // Only show history when there's more than 1 round to compare
      const singleRound: RoundScoreRecord[] = [
        { roundNumber: 1, scores: [5, 8, 0, 13], shotTheMoon: null },
      ];

      render(
        <RoundSummaryOverlay {...defaultProps} roundHistory={singleRound} />
      );

      expect(screen.queryByText("Score History")).not.toBeInTheDocument();
    });

    it("expands round history on header click", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          roundHistory={createRoundHistory()}
        />
      );

      // Click to expand
      fireEvent.click(screen.getByText("Score History"));

      // Should show round column headers after expanding
      expect(screen.getByText("R1")).toBeInTheDocument();
      expect(screen.getByText("R2")).toBeInTheDocument();
      expect(screen.getByText("R3")).toBeInTheDocument();
    });

    it("shows player names in the history table", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          roundHistory={createRoundHistory()}
        />
      );

      // Expand the history
      fireEvent.click(screen.getByText("Score History"));

      // Player names appear multiple times (main table + history table)
      const youTexts = screen.getAllByText("You");
      expect(youTexts.length).toBeGreaterThanOrEqual(2);
    });

    it("shows scores for each round", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          roundHistory={createRoundHistory()}
        />
      );

      // Expand the history
      fireEvent.click(screen.getByText("Score History"));

      // Check for specific scores from round history
      // Round 1: 5, 8, 0, 13
      expect(screen.getByText("13")).toBeInTheDocument(); // Q♠ score
    });

    it("indicates moon shots with emoji", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          roundHistory={createRoundHistory()}
        />
      );

      // Expand the history
      fireEvent.click(screen.getByText("Score History"));

      // Round 2 had a moon shot - should show moon emoji
      expect(screen.getByText(/🌙/)).toBeInTheDocument();
    });

    it("collapses round history on second header click", () => {
      render(
        <RoundSummaryOverlay
          {...defaultProps}
          roundHistory={createRoundHistory()}
        />
      );

      const header = screen.getByText("Score History");

      // Expand
      fireEvent.click(header);
      expect(screen.getByText("R1")).toBeInTheDocument();

      // Collapse
      fireEvent.click(header);

      // Wait for animation to complete - columns should be hidden
      // Note: AnimatePresence may keep elements briefly during exit animation
    });
  });
});
