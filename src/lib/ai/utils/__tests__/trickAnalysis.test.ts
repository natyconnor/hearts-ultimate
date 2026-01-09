import { describe, it, expect } from "vitest";
import {
  getPenaltyPointsInTrick,
  getHighestRankInTrick,
  isLastToPlay,
  isQueenOfSpadesInTrick,
} from "../trickAnalysis";
import { createCard } from "../../../../game/deck";
import type { Card } from "../../../../types/game";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  createCard(suit, rank);

describe("trickAnalysis - getPenaltyPointsInTrick", () => {
  it("counts hearts as 1 point each", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("hearts", 7) },
      { playerId: "p3", card: card("hearts", 10) },
    ];

    expect(getPenaltyPointsInTrick(trick)).toBe(2);
  });

  it("counts Queen of Spades as 13 points", () => {
    const trick = [{ playerId: "p1", card: card("spades", 12) }];

    expect(getPenaltyPointsInTrick(trick)).toBe(13);
  });

  it("combines hearts and Queen of Spades", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 12) }, // 13 points
      { playerId: "p2", card: card("hearts", 7) }, // 1 point
      { playerId: "p3", card: card("hearts", 10) }, // 1 point
    ];

    expect(getPenaltyPointsInTrick(trick)).toBe(15);
  });

  it("returns 0 for no penalty cards", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("diamonds", 7) },
    ];

    expect(getPenaltyPointsInTrick(trick)).toBe(0);
  });

  it("handles empty trick", () => {
    expect(getPenaltyPointsInTrick([])).toBe(0);
  });
});

describe("trickAnalysis - getHighestRankInTrick", () => {
  it("finds highest rank of lead suit", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("clubs", 10) },
      { playerId: "p3", card: card("clubs", 7) },
    ];

    expect(getHighestRankInTrick(trick, "clubs")).toBe(10);
  });

  it("ignores non-lead suit cards", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("spades", 14) }, // Ace doesn't count
      { playerId: "p3", card: card("clubs", 7) },
    ];

    expect(getHighestRankInTrick(trick, "clubs")).toBe(7);
  });

  it("returns 0 if no cards of lead suit", () => {
    const trick = [
      { playerId: "p1", card: card("hearts", 5) },
      { playerId: "p2", card: card("spades", 7) },
    ];

    expect(getHighestRankInTrick(trick, "clubs")).toBe(0);
  });

  it("handles single card", () => {
    const trick = [{ playerId: "p1", card: card("clubs", 10) }];

    expect(getHighestRankInTrick(trick, "clubs")).toBe(10);
  });
});

describe("trickAnalysis - isLastToPlay", () => {
  it("returns true when 3 cards already played", () => {
    expect(isLastToPlay(3)).toBe(true);
  });

  it("returns false for other positions", () => {
    expect(isLastToPlay(0)).toBe(false);
    expect(isLastToPlay(1)).toBe(false);
    expect(isLastToPlay(2)).toBe(false);
    expect(isLastToPlay(4)).toBe(false);
  });
});

describe("trickAnalysis - isQueenOfSpadesInTrick", () => {
  it("detects Queen of Spades", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 12) },
      { playerId: "p2", card: card("clubs", 5) },
    ];

    expect(isQueenOfSpadesInTrick(trick)).toBe(true);
  });

  it("returns false when Queen not present", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 11) }, // Jack
      { playerId: "p2", card: card("spades", 13) }, // King
    ];

    expect(isQueenOfSpadesInTrick(trick)).toBe(false);
  });

  it("handles empty trick", () => {
    expect(isQueenOfSpadesInTrick([])).toBe(false);
  });
});
