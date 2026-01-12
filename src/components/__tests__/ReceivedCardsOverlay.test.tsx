import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { ReceivedCardsOverlay } from "../ReceivedCardsOverlay";
import { createTestPlayers, createMixedHand, createCard } from "../../test/testUtils";

describe("ReceivedCardsOverlay Component", () => {
  const players = createTestPlayers().map((p) => ({
    ...p,
    hand: createMixedHand(),
  }));

  const receivedCards = [
    createCard("hearts", 14),
    createCard("spades", 12),
    createCard("diamonds", 7),
  ];

  const defaultProps = {
    players,
    currentPlayerIndex: 0,
    passDirection: "left" as const,
    receivedCards,
    onReady: vi.fn(),
    isLoading: false,
    hasConfirmedReady: false,
    waitingForPlayers: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders cards received header", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      expect(screen.getByText("Cards Received!")).toBeInTheDocument();
    });

    it("shows gift emoji", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      expect(screen.getByText("🎁")).toBeInTheDocument();
    });

    it("displays who passed the cards", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      // For left pass, we receive from the player to our right (player 3)
      expect(screen.getByText(/Bot Carol/)).toBeInTheDocument();
    });
  });

  describe("Pass Direction Display", () => {
    it("shows correct sender for left pass (receive from right)", () => {
      render(
        <ReceivedCardsOverlay {...defaultProps} passDirection="left" />
      );
      // Left pass = receive from right (player 3 = Bot Carol)
      expect(screen.getByText(/Bot Carol/)).toBeInTheDocument();
    });

    it("shows correct sender for right pass (receive from left)", () => {
      render(
        <ReceivedCardsOverlay {...defaultProps} passDirection="right" />
      );
      // Right pass = receive from left (player 1 = Bot Alice)
      expect(screen.getByText(/Bot Alice/)).toBeInTheDocument();
    });

    it("shows correct sender for across pass", () => {
      render(
        <ReceivedCardsOverlay {...defaultProps} passDirection="across" />
      );
      // Across pass = receive from across (player 2 = Bot Bob)
      expect(screen.getByText(/Bot Bob/)).toBeInTheDocument();
    });

    it("shows pass direction description", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      expect(screen.getByText(/Pass Left/)).toBeInTheDocument();
    });
  });

  describe("Received Cards Display", () => {
    it("displays all three received cards prominently", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);

      // Check for card values - A (ace of hearts), Q (queen of spades), 7 (diamonds)
      expect(screen.getAllByText("A").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Q").length).toBeGreaterThan(0);
      expect(screen.getAllByText("7").length).toBeGreaterThan(0);
    });

    it("shows received cards with highlight ring", () => {
      const { container } = render(
        <ReceivedCardsOverlay {...defaultProps} />
      );

      // Received cards have amber ring
      const highlightedCards = container.querySelectorAll(".ring-amber-400");
      expect(highlightedCards.length).toBeGreaterThan(0);
    });
  });

  describe("Full Hand Display", () => {
    it("shows the full hand with received cards highlighted", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);

      // Hint text about highlighted cards
      expect(
        screen.getByText("These cards are now highlighted in your hand ↓")
      ).toBeInTheDocument();
    });

    it("shows sparkle badge on received cards in hand", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);

      // Sparkle emoji on received cards
      const sparkles = screen.getAllByText("✨");
      expect(sparkles.length).toBeGreaterThan(0);
    });
  });

  describe("Ready Button", () => {
    it("renders Ready to Play button", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      expect(screen.getByText("Ready to Play! 🃏")).toBeInTheDocument();
    });

    it("calls onReady when clicked", () => {
      const onReady = vi.fn();
      render(<ReceivedCardsOverlay {...defaultProps} onReady={onReady} />);

      fireEvent.click(screen.getByText("Ready to Play! 🃏"));
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it("shows loading state", () => {
      render(<ReceivedCardsOverlay {...defaultProps} isLoading={true} />);
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });

    it("disables button when loading", () => {
      render(<ReceivedCardsOverlay {...defaultProps} isLoading={true} />);

      const button = screen.getByText("Starting...").closest("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Hint Text", () => {
    it("shows hint about clicking when ready", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      expect(
        screen.getByText("Click when you're ready to start the round")
      ).toBeInTheDocument();
    });
  });

  describe("AI Player Indication", () => {
    it("shows robot emoji for AI sender", () => {
      render(<ReceivedCardsOverlay {...defaultProps} />);
      // Sender is AI
      expect(screen.getByText(/🤖/)).toBeInTheDocument();
    });
  });

  describe("Waiting State (after player clicks Ready)", () => {
    it("shows waiting message when player has confirmed", () => {
      render(
        <ReceivedCardsOverlay {...defaultProps} hasConfirmedReady={true} />
      );
      expect(
        screen.getByText("Waiting for other players...")
      ).toBeInTheDocument();
    });

    it("hides Ready button when player has confirmed", () => {
      render(
        <ReceivedCardsOverlay {...defaultProps} hasConfirmedReady={true} />
      );
      expect(screen.queryByText("Ready to Play! 🃏")).not.toBeInTheDocument();
    });

    it("shows names of players still reviewing", () => {
      render(
        <ReceivedCardsOverlay
          {...defaultProps}
          hasConfirmedReady={true}
          waitingForPlayers={["Alice", "Bob"]}
        />
      );
      expect(screen.getByText(/Alice, Bob/)).toBeInTheDocument();
      expect(screen.getByText(/are still reviewing/)).toBeInTheDocument();
    });

    it("shows singular form for one player waiting", () => {
      render(
        <ReceivedCardsOverlay
          {...defaultProps}
          hasConfirmedReady={true}
          waitingForPlayers={["Alice"]}
        />
      );
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/is still reviewing/)).toBeInTheDocument();
    });

    it("hides hint text when already confirmed", () => {
      render(
        <ReceivedCardsOverlay {...defaultProps} hasConfirmedReady={true} />
      );
      expect(
        screen.queryByText("Click when you're ready to start the round")
      ).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty received cards gracefully", () => {
      const props = {
        ...defaultProps,
        receivedCards: [],
      };

      render(<ReceivedCardsOverlay {...props} />);
      expect(screen.getByText("Cards Received!")).toBeInTheDocument();
    });

    it("handles different card combinations", () => {
      const specialCards = [
        createCard("spades", 14), // Ace of Spades
        createCard("hearts", 2), // 2 of Hearts
        createCard("clubs", 11), // Jack of Clubs
      ];

      render(
        <ReceivedCardsOverlay
          {...defaultProps}
          receivedCards={specialCards}
        />
      );

      expect(screen.getAllByText("A").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
      expect(screen.getAllByText("J").length).toBeGreaterThan(0);
    });
  });
});
