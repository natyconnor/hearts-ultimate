import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { PassingPhaseOverlay } from "../PassingPhaseOverlay";
import { createTestPlayers, createMixedHand, createCard } from "../../test/testUtils";
import type { Card } from "../../types/game";

describe("PassingPhaseOverlay Component", () => {
  const players = createTestPlayers().map((p) => ({
    ...p,
    hand: createMixedHand(),
  }));

  const defaultProps = {
    players,
    currentPlayerIndex: 0,
    passDirection: "left" as const,
    selectedCards: [] as Card[],
    onCardToggle: vi.fn(),
    onConfirmPass: vi.fn(),
    isSubmitting: false,
    hasSubmitted: false,
    waitingForPlayers: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders pass direction header", () => {
      render(<PassingPhaseOverlay {...defaultProps} />);
      expect(screen.getByText(/Pass Left/)).toBeInTheDocument();
    });

    it("shows target player name", () => {
      render(<PassingPhaseOverlay {...defaultProps} />);
      // Pass left means passing to player index 1 (Bot Alice)
      expect(screen.getByText(/Bot Alice/)).toBeInTheDocument();
    });

    it("displays pass direction emoji", () => {
      render(<PassingPhaseOverlay {...defaultProps} />);
      // Left pass uses arrow emoji (⬅️) - appears in header and button
      const emojis = screen.getAllByText(/⬅️/);
      expect(emojis.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Pass Directions", () => {
    it("shows correct target for pass left", () => {
      render(
        <PassingPhaseOverlay {...defaultProps} passDirection="left" />
      );
      expect(screen.getByText(/Bot Alice/)).toBeInTheDocument();
    });

    it("shows correct target for pass right", () => {
      render(
        <PassingPhaseOverlay {...defaultProps} passDirection="right" />
      );
      // Pass right from player 0 goes to player 3
      expect(screen.getByText(/Bot Carol/)).toBeInTheDocument();
    });

    it("shows correct target for pass across", () => {
      render(
        <PassingPhaseOverlay {...defaultProps} passDirection="across" />
      );
      // Pass across from player 0 goes to player 2
      expect(screen.getByText(/Bot Bob/)).toBeInTheDocument();
    });
  });

  describe("Selection Counter", () => {
    it("shows 0/3 when no cards selected", () => {
      render(<PassingPhaseOverlay {...defaultProps} selectedCards={[]} />);
      expect(screen.getByText("0/3 cards selected")).toBeInTheDocument();
    });

    it("shows 1/3 when one card selected", () => {
      const selectedCards = [createCard("hearts", 5)];
      render(
        <PassingPhaseOverlay {...defaultProps} selectedCards={selectedCards} />
      );
      expect(screen.getByText("1/3 cards selected")).toBeInTheDocument();
    });

    it("shows 2/3 when two cards selected", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
      ];
      render(
        <PassingPhaseOverlay {...defaultProps} selectedCards={selectedCards} />
      );
      expect(screen.getByText("2/3 cards selected")).toBeInTheDocument();
    });

    it("shows 3/3 when three cards selected", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay {...defaultProps} selectedCards={selectedCards} />
      );
      expect(screen.getByText("3/3 cards selected")).toBeInTheDocument();
    });
  });

  describe("Card Selection", () => {
    it("calls onCardToggle when a card is clicked", () => {
      const onCardToggle = vi.fn();
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          onCardToggle={onCardToggle}
        />
      );

      // Find and click a card
      const cardElement = screen.getAllByText("2")[0].closest('[class*="absolute"]');
      if (cardElement) {
        fireEvent.click(cardElement);
        expect(onCardToggle).toHaveBeenCalled();
      }
    });

    it("shows selected card preview area", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
      ];
      render(
        <PassingPhaseOverlay {...defaultProps} selectedCards={selectedCards} />
      );

      expect(screen.getByText("Passing:")).toBeInTheDocument();
    });
  });

  describe("Confirm Button", () => {
    it("disables button when less than 3 cards selected", () => {
      const selectedCards = [createCard("hearts", 5)];
      render(
        <PassingPhaseOverlay {...defaultProps} selectedCards={selectedCards} />
      );

      const button = screen.getByText(/Pass Cards/).closest("button");
      expect(button).toBeDisabled();
    });

    it("enables button when 3 cards selected", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay {...defaultProps} selectedCards={selectedCards} />
      );

      const button = screen.getByText(/Pass Cards/).closest("button");
      expect(button).not.toBeDisabled();
    });

    it("calls onConfirmPass when clicked with 3 cards", () => {
      const onConfirmPass = vi.fn();
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          selectedCards={selectedCards}
          onConfirmPass={onConfirmPass}
        />
      );

      fireEvent.click(screen.getByText(/Pass Cards/));
      expect(onConfirmPass).toHaveBeenCalledTimes(1);
    });
  });

  describe("Submitting State", () => {
    it("shows loading indicator when submitting", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          selectedCards={selectedCards}
          isSubmitting={true}
        />
      );

      expect(screen.getByText("Passing...")).toBeInTheDocument();
    });

    it("disables button when submitting", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          selectedCards={selectedCards}
          isSubmitting={true}
        />
      );

      const button = screen.getByText("Passing...").closest("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Submitted State", () => {
    it("shows submitted message after cards are passed", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          selectedCards={selectedCards}
          hasSubmitted={true}
        />
      );

      expect(screen.getByText("Cards submitted!")).toBeInTheDocument();
    });

    it("shows selected cards after submission", () => {
      const selectedCards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          selectedCards={selectedCards}
          hasSubmitted={true}
        />
      );

      // Should show mini cards
      expect(screen.getAllByText("5").length).toBeGreaterThan(0);
      expect(screen.getAllByText("10").length).toBeGreaterThan(0);
      expect(screen.getAllByText("A").length).toBeGreaterThan(0);
    });
  });

  describe("Waiting for Players", () => {
    it("shows waiting message when others are selecting", () => {
      render(
        <PassingPhaseOverlay
          {...defaultProps}
          waitingForPlayers={["Bot Alice", "Bot Bob"]}
        />
      );

      expect(screen.getByText("Waiting for:")).toBeInTheDocument();
      expect(screen.getByText("Bot Alice, Bot Bob")).toBeInTheDocument();
    });

    it("does not show waiting message when no one is waiting", () => {
      render(
        <PassingPhaseOverlay {...defaultProps} waitingForPlayers={[]} />
      );

      expect(screen.queryByText("Waiting for:")).not.toBeInTheDocument();
    });
  });

  describe("Round Info", () => {
    it("shows passing order explanation", () => {
      render(<PassingPhaseOverlay {...defaultProps} />);
      expect(
        screen.getByText(/Left → Right → Across → Hold/)
      ).toBeInTheDocument();
    });
  });

  describe("AI Player Indication", () => {
    it("shows robot emoji for AI target", () => {
      render(<PassingPhaseOverlay {...defaultProps} />);
      // Target is AI (Bot Alice)
      expect(screen.getByText(/🤖/)).toBeInTheDocument();
    });
  });
});
