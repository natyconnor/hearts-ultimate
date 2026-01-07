import { describe, it, expect } from "vitest";
import {
  calculateCardHandLayout,
  calculateCardPosition,
  cardsEqual,
  getTrickCardPosition,
  getPlayerStartPosition,
  getWinnerPosition,
} from "../cardDisplay";
import type { Card } from "../../types/game";

const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({ suit, rank });

describe("cardDisplay - calculateCardHandLayout", () => {
  it("calculates layout for different card counts", () => {
    const layout = calculateCardHandLayout(13);
    expect(layout.maxRotation).toBeLessThanOrEqual(25);
    expect(layout.cardSpacing).toBeLessThanOrEqual(60);
    expect(layout.totalWidth).toBe(layout.cardSpacing * 13);
  });

  it("respects custom options", () => {
    const layout = calculateCardHandLayout(10, {
      maxRotationCap: 15,
      maxSpacing: 40,
    });
    expect(layout.maxRotation).toBeLessThanOrEqual(15);
    expect(layout.cardSpacing).toBeLessThanOrEqual(40);
  });

  it("handles edge cases", () => {
    const singleCard = calculateCardHandLayout(1);
    expect(singleCard.maxRotation).toBeGreaterThanOrEqual(0);
    expect(singleCard.cardSpacing).toBeGreaterThan(0);
  });
});

describe("cardDisplay - calculateCardPosition", () => {
  it("positions cards symmetrically around center", () => {
    const config = calculateCardHandLayout(5);

    const pos0 = calculateCardPosition(0, 5, config);
    const pos4 = calculateCardPosition(4, 5, config);

    // Should be mirrored
    expect(pos0.xOffset).toBe(-pos4.xOffset);
    expect(pos0.rotation).toBe(-pos4.rotation);
    expect(pos0.yOffset).toBe(pos4.yOffset); // Same distance from center
  });

  it("positions center card at zero", () => {
    const config = calculateCardHandLayout(5);
    const centerPos = calculateCardPosition(2, 5, config); // Middle of 5 cards

    expect(centerPos.xOffset).toBe(0);
    expect(centerPos.rotation).toBe(0);
    expect(centerPos.yOffset).toBe(0);
  });

  it("applies custom y offset multiplier", () => {
    const config = calculateCardHandLayout(5);

    const defaultY = calculateCardPosition(0, 5, config);
    const customY = calculateCardPosition(0, 5, config, {
      yOffsetMultiplier: 8,
    });

    expect(customY.yOffset).toBe(defaultY.yOffset * 2);
  });
});

describe("cardDisplay - cardsEqual", () => {
  it("compares cards correctly", () => {
    const card1 = card("hearts", 7);
    const card2 = card("hearts", 7);
    const card3 = card("hearts", 8);
    const card4 = card("spades", 7);

    expect(cardsEqual(card1, card2)).toBe(true);
    expect(cardsEqual(card1, card3)).toBe(false);
    expect(cardsEqual(card1, card4)).toBe(false);
  });
});

describe("cardDisplay - trick positions", () => {
  it("positions cards in circle clockwise", () => {
    const bottom = getTrickCardPosition(0);
    const left = getTrickCardPosition(1);
    const top = getTrickCardPosition(2);
    const right = getTrickCardPosition(3);

    expect(bottom.y).toBeGreaterThan(0); // Bottom = positive Y
    expect(top.y).toBeLessThan(0); // Top = negative Y
    expect(left.x).toBeLessThan(0); // Left = negative X
    expect(right.x).toBeGreaterThan(0); // Right = positive X
  });

  it("has correct start positions for animations", () => {
    const bottom = getPlayerStartPosition(0);
    const left = getPlayerStartPosition(1);

    expect(bottom.y).toBeGreaterThan(getTrickCardPosition(0).y); // Further down
    expect(left.x).toBeLessThan(getTrickCardPosition(1).x); // Further left
  });

  it("has correct winner positions", () => {
    const positions = [0, 1, 2, 3].map(getWinnerPosition);

    positions.forEach((pos) => {
      expect(pos.x !== undefined).toBe(true);
      expect(pos.y !== undefined).toBe(true);
    });
  });
});
