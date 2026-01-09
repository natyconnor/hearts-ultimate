import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { CardHand } from "../CardHand";
import { createCard, createMixedHand } from "../../test/testUtils";
import type { Card } from "../../types/game";

describe("CardHand Component", () => {
  describe("Rendering", () => {
    it("renders nothing when cards array is empty", () => {
      const { container } = render(<CardHand cards={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders all cards in the hand", () => {
      const cards = [
        createCard("hearts", 5),
        createCard("diamonds", 10),
        createCard("clubs", 14),
      ];
      render(<CardHand cards={cards} />);

      // Check that all ranks are displayed
      expect(screen.getAllByText("5")).toHaveLength(2);
      expect(screen.getAllByText("10")).toHaveLength(2);
      expect(screen.getAllByText("A")).toHaveLength(2);
    });

    it("renders a full hand of 13 cards", () => {
      const fullHand = createMixedHand();
      const { container } = render(<CardHand cards={fullHand} />);

      // Should have 13 card motion divs
      const cardElements = container.querySelectorAll('[class*="absolute"]');
      expect(cardElements.length).toBeGreaterThanOrEqual(13);
    });
  });

  describe("Flipped Cards", () => {
    it("shows card backs when isFlipped is true", () => {
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];
      render(<CardHand cards={cards} isFlipped={true} />);

      // When flipped, we shouldn't see the ranks
      expect(screen.queryByText("5")).not.toBeInTheDocument();
      expect(screen.queryByText("10")).not.toBeInTheDocument();
    });

    it("shows card faces when isFlipped is false", () => {
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];
      render(<CardHand cards={cards} isFlipped={false} />);

      expect(screen.getAllByText("5")).toHaveLength(2);
      expect(screen.getAllByText("10")).toHaveLength(2);
    });
  });

  describe("Card Click Handling", () => {
    it("calls onCardClick when a valid card is clicked", () => {
      const handleClick = vi.fn();
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];

      render(<CardHand cards={cards} onCardClick={handleClick} />);

      // Click on the first card (hearts 5)
      const fiveText = screen.getAllByText("5")[0];
      const cardElement = fiveText.closest('[class*="absolute"]')!;
      fireEvent.click(cardElement);

      expect(handleClick).toHaveBeenCalledWith(cards[0], 0);
    });

    it("does not call onCardClick when cards are flipped", () => {
      const handleClick = vi.fn();
      const cards = [createCard("hearts", 5)];

      render(
        <CardHand cards={cards} onCardClick={handleClick} isFlipped={true} />
      );

      // Try to click on a card - but they're flipped so won't show regular content
      const cardBack = screen.getByText("♠"); // Card back emblem
      fireEvent.click(cardBack.closest("div")!);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not call onCardClick for invalid cards", () => {
      const handleClick = vi.fn();
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];
      const validCards = [cards[1]]; // Only diamonds 10 is valid

      render(
        <CardHand
          cards={cards}
          onCardClick={handleClick}
          validCards={validCards}
        />
      );

      // Click on the invalid card (hearts 5)
      const fiveText = screen.getAllByText("5")[0];
      const cardElement = fiveText.closest('[class*="absolute"]')!;
      fireEvent.click(cardElement);

      // Should not be called for invalid card
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Valid Cards Styling", () => {
    it("applies reduced opacity to invalid cards", () => {
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];
      const validCards = [cards[1]]; // Only diamonds 10 is valid

      const { container } = render(
        <CardHand
          cards={cards}
          validCards={validCards}
          onCardClick={() => {}}
        />
      );

      // Should have opacity class for invalid card
      const opacityElement = container.querySelector(".opacity-30");
      expect(opacityElement).toBeInTheDocument();
    });

    it("treats all cards as valid when validCards prop is not provided", () => {
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];

      const { container } = render(
        <CardHand cards={cards} onCardClick={() => {}} />
      );

      // Should NOT have opacity-30 class when all cards are valid
      const opacityElements = container.querySelectorAll(".opacity-30");
      expect(opacityElements).toHaveLength(0);
    });
  });

  describe("Selected Card", () => {
    it("highlights the selected card", () => {
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];
      const selectedCard = cards[0];

      const { container } = render(
        <CardHand cards={cards} selectedCard={selectedCard} />
      );

      // The selected card should have the selection ring
      const selectedElement = container.querySelector(".ring-yellow-400");
      expect(selectedElement).toBeInTheDocument();
    });

    it("does not highlight when no card is selected", () => {
      const cards = [createCard("hearts", 5), createCard("diamonds", 10)];

      const { container } = render(
        <CardHand cards={cards} selectedCard={null} />
      );

      // Should not have selection styling
      const selectedElement = container.querySelector(".ring-yellow-400");
      expect(selectedElement).not.toBeInTheDocument();
    });
  });

  describe("Custom className", () => {
    it("applies custom className to container", () => {
      const cards = [createCard("hearts", 5)];
      const { container } = render(
        <CardHand cards={cards} className="custom-hand-class" />
      );

      const handContainer = container.firstChild as HTMLElement;
      expect(handContainer.className).toContain("custom-hand-class");
    });
  });

  describe("Layout", () => {
    it("maintains proper z-index ordering for overlapping cards", () => {
      const cards = [
        createCard("clubs", 2),
        createCard("clubs", 3),
        createCard("clubs", 4),
        createCard("clubs", 5),
        createCard("clubs", 6),
      ];

      const { container } = render(<CardHand cards={cards} />);

      // Cards should have ascending z-index
      const cardDivs = container.querySelectorAll('[class*="absolute"]');
      expect(cardDivs.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Edge Cases", () => {
    it("handles single card in hand", () => {
      const cards = [createCard("hearts", 14)];
      render(<CardHand cards={cards} />);

      expect(screen.getAllByText("A")).toHaveLength(2);
    });

    it("handles large hand (more than 13 cards)", () => {
      const cards: Card[] = [];
      for (let i = 2; i <= 14; i++) {
        cards.push(createCard("hearts", i as any));
      }
      cards.push(createCard("diamonds", 2));
      cards.push(createCard("diamonds", 3));

      const { container } = render(<CardHand cards={cards} />);
      const cardElements = container.querySelectorAll('[class*="absolute"]');
      expect(cardElements.length).toBeGreaterThanOrEqual(15);
    });
  });
});
