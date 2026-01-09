import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { Card } from "../Card";

describe("Card Component", () => {
  describe("Rendering", () => {
    it("renders a card with suit and rank", () => {
      render(<Card suit="hearts" rank={14} />);
      // Ace of hearts should show "A" and "♥"
      expect(screen.getAllByText("A")).toHaveLength(2); // Top-left and bottom-right
      expect(screen.getAllByText("♥")).toHaveLength(3); // Corners + center
    });

    it("renders face cards with correct letters", () => {
      const { rerender } = render(<Card suit="spades" rank={11} />);
      expect(screen.getAllByText("J")).toHaveLength(2);

      rerender(<Card suit="spades" rank={12} />);
      expect(screen.getAllByText("Q")).toHaveLength(2);

      rerender(<Card suit="spades" rank={13} />);
      expect(screen.getAllByText("K")).toHaveLength(2);
    });

    it("renders number cards with correct numbers", () => {
      render(<Card suit="diamonds" rank={7} />);
      expect(screen.getAllByText("7")).toHaveLength(2);
    });

    it("renders all suit symbols correctly", () => {
      const { rerender } = render(<Card suit="clubs" rank={2} />);
      expect(screen.getAllByText("♣").length).toBeGreaterThan(0);

      rerender(<Card suit="diamonds" rank={2} />);
      expect(screen.getAllByText("♦").length).toBeGreaterThan(0);

      rerender(<Card suit="spades" rank={2} />);
      expect(screen.getAllByText("♠").length).toBeGreaterThan(0);

      rerender(<Card suit="hearts" rank={2} />);
      expect(screen.getAllByText("♥").length).toBeGreaterThan(0);
    });
  });

  describe("Flipped State", () => {
    it("shows card back when flipped", () => {
      render(<Card suit="hearts" rank={10} isFlipped={true} />);
      // When flipped, we shouldn't see the rank
      expect(screen.queryByText("10")).not.toBeInTheDocument();
      // Should see the back design with spade emblem
      expect(screen.getByText("♠")).toBeInTheDocument();
    });

    it("shows card face when not flipped", () => {
      render(<Card suit="hearts" rank={10} isFlipped={false} />);
      expect(screen.getAllByText("10")).toHaveLength(2);
      expect(screen.getAllByText("♥")).toHaveLength(3);
    });
  });

  describe("Mini Card Variant", () => {
    it("renders simplified design when isMini is true", () => {
      render(<Card suit="clubs" rank={14} isMini={true} />);
      // Mini cards have rank in corners and single center suit
      expect(screen.getAllByText("A")).toHaveLength(2);
      expect(screen.getAllByText("♣")).toHaveLength(1); // Only center, no corner suits
    });

    it("renders full design when isMini is false", () => {
      render(<Card suit="clubs" rank={14} isMini={false} />);
      expect(screen.getAllByText("A")).toHaveLength(2);
      // Full cards have suits in corners AND center
      expect(screen.getAllByText("♣")).toHaveLength(3);
    });
  });

  describe("Selected State", () => {
    it("applies selected styles when isSelected is true", () => {
      const { container } = render(
        <Card suit="hearts" rank={5} isSelected={true} />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("ring-4");
      expect(card.className).toContain("ring-yellow-400");
      expect(card.className).toContain("scale-110");
    });

    it("does not apply selected styles when isSelected is false", () => {
      const { container } = render(
        <Card suit="hearts" rank={5} isSelected={false} />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain("ring-4");
      expect(card.className).not.toContain("scale-110");
    });

    it("renders selection glow effect when selected", () => {
      const { container } = render(
        <Card suit="hearts" rank={5} isSelected={true} />
      );
      // Look for the glow div
      const glowElement = container.querySelector(".animate-pulse");
      expect(glowElement).toBeInTheDocument();
    });
  });

  describe("Click Behavior", () => {
    it("calls onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<Card suit="diamonds" rank={9} onClick={handleClick} />);

      const card = screen.getAllByText("9")[0].closest("div")!;
      fireEvent.click(card.parentElement!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies cursor-pointer class when onClick is provided", () => {
      const { container } = render(
        <Card suit="diamonds" rank={9} onClick={() => {}} />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("cursor-pointer");
    });

    it("does not apply cursor-pointer when no onClick", () => {
      const { container } = render(<Card suit="diamonds" rank={9} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain("cursor-pointer");
    });
  });

  describe("Custom className", () => {
    it("merges custom className with default classes", () => {
      const { container } = render(
        <Card suit="spades" rank={3} className="custom-test-class" />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain("custom-test-class");
      expect(card.className).toContain("rounded-xl"); // Default class still present
    });
  });

  describe("Color Coding", () => {
    it("applies red color for hearts", () => {
      const { container } = render(<Card suit="hearts" rank={6} />);
      const suitElement = container.querySelector(".text-red-600");
      expect(suitElement).toBeInTheDocument();
    });

    it("applies red color for diamonds", () => {
      const { container } = render(<Card suit="diamonds" rank={6} />);
      const suitElement = container.querySelector(".text-red-600");
      expect(suitElement).toBeInTheDocument();
    });

    it("applies black color for spades", () => {
      const { container } = render(<Card suit="spades" rank={6} />);
      const suitElement = container.querySelector(".text-slate-900");
      expect(suitElement).toBeInTheDocument();
    });

    it("applies black color for clubs", () => {
      const { container } = render(<Card suit="clubs" rank={6} />);
      const suitElement = container.querySelector(".text-slate-900");
      expect(suitElement).toBeInTheDocument();
    });
  });

  describe("All Ranks", () => {
    const ranks: Array<{ rank: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; expected: string }> = [
      { rank: 2, expected: "2" },
      { rank: 3, expected: "3" },
      { rank: 4, expected: "4" },
      { rank: 5, expected: "5" },
      { rank: 6, expected: "6" },
      { rank: 7, expected: "7" },
      { rank: 8, expected: "8" },
      { rank: 9, expected: "9" },
      { rank: 10, expected: "10" },
      { rank: 11, expected: "J" },
      { rank: 12, expected: "Q" },
      { rank: 13, expected: "K" },
      { rank: 14, expected: "A" },
    ];

    ranks.forEach(({ rank, expected }) => {
      it(`renders rank ${rank} as "${expected}"`, () => {
        render(<Card suit="clubs" rank={rank} />);
        expect(screen.getAllByText(expected)).toHaveLength(2);
      });
    });
  });
});
