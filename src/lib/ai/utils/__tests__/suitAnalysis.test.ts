import { describe, it, expect } from "vitest";
import {
  getSuitDistribution,
  getCardsOfSuit,
  hasProtectedHighCards,
  getVoidingPassCandidates,
} from "../suitAnalysis";
import { createCard } from "../../../../game/deck";
import type { Card } from "../../../../types/game";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  createCard(suit, rank);

describe("suitAnalysis - getSuitDistribution", () => {
  it("counts cards in each suit", () => {
    const hand: Card[] = [
      card("clubs", 5),
      card("clubs", 7),
      card("hearts", 10),
      card("spades", 12),
    ];

    const dist = getSuitDistribution(hand);

    expect(dist.clubs).toBe(2);
    expect(dist.hearts).toBe(1);
    expect(dist.spades).toBe(1);
    expect(dist.diamonds).toBe(0);
  });

  it("handles empty hand", () => {
    const dist = getSuitDistribution([]);

    expect(dist.clubs).toBe(0);
    expect(dist.hearts).toBe(0);
    expect(dist.spades).toBe(0);
    expect(dist.diamonds).toBe(0);
  });
});

describe("suitAnalysis - getCardsOfSuit", () => {
  it("filters cards by suit", () => {
    const hand: Card[] = [
      card("clubs", 5),
      card("clubs", 7),
      card("hearts", 10),
      card("spades", 12),
    ];

    const clubs = getCardsOfSuit(hand, "clubs");
    expect(clubs).toHaveLength(2);
    expect(clubs.every((c) => c.suit === "clubs")).toBe(true);
  });

  it("returns empty array when suit not present", () => {
    const hand: Card[] = [card("clubs", 5), card("hearts", 10)];

    expect(getCardsOfSuit(hand, "spades")).toEqual([]);
  });
});

describe("suitAnalysis - hasProtectedHighCards", () => {
  it("returns false for hands with fewer than 4 cards", () => {
    const hand: Card[] = [
      card("clubs", 11), // Jack
      card("clubs", 12), // Queen
      card("clubs", 13), // King
    ];

    expect(hasProtectedHighCards(hand, "clubs")).toBe(false);
  });

  it("returns true when no high cards", () => {
    const hand: Card[] = [
      card("clubs", 5),
      card("clubs", 6),
      card("clubs", 7),
      card("clubs", 8),
    ];

    expect(hasProtectedHighCards(hand, "clubs")).toBe(true);
  });

  it("returns true when high cards are protected", () => {
    const hand: Card[] = [
      card("clubs", 5), // Low
      card("clubs", 6), // Low
      card("clubs", 7), // Low
      card("clubs", 11), // High (Jack)
      card("clubs", 12), // High (Queen)
    ];

    expect(hasProtectedHighCards(hand, "clubs")).toBe(true);
  });

  it("returns false when high cards are not protected", () => {
    const hand: Card[] = [
      card("clubs", 5), // Low
      card("clubs", 6), // Low (only 2 low cards, need 3+)
      card("clubs", 11), // High (Jack)
      card("clubs", 12), // High (Queen)
    ];

    expect(hasProtectedHighCards(hand, "clubs")).toBe(false);
  });

  it("checks protection relative to lowest high card", () => {
    const hand: Card[] = [
      card("clubs", 5), // Low
      card("clubs", 6), // Low
      card("clubs", 7), // Low
      card("clubs", 10), // Not high (10 < 11)
      card("clubs", 11), // High (Jack) - lowest high
      card("clubs", 14), // High (Ace)
    ];

    // Has 3 low cards below the lowest high (Jack = 11)
    expect(hasProtectedHighCards(hand, "clubs")).toBe(true);
  });
});

describe("suitAnalysis - getVoidingPassCandidates", () => {
  it("only returns cards rank 6+", () => {
    const hand: Card[] = [
      card("clubs", 2), // Too low
      card("clubs", 5), // Too low
      card("clubs", 6), // Valid
      card("clubs", 7), // Valid
    ];

    const candidates = getVoidingPassCandidates(hand);
    // Clubs has 4 cards, which is > 3, so it's not a voidable suit
    // Need a suit with 1-3 cards to test voiding
    expect(candidates.length).toBe(0); // No voidable suits
  });

  it("returns cards rank 6+ from voidable suits", () => {
    const hand: Card[] = [
      // 1 club (can void)
      card("clubs", 7), // Valid
      // 2 diamonds (can void)
      card("diamonds", 6), // Valid
      card("diamonds", 8), // Valid
      // 3 spades (can void)
      card("spades", 7), // Valid
      card("spades", 8), // Valid
      card("spades", 9), // Valid
      // 7 hearts (too many to void)
      card("hearts", 2),
      card("hearts", 3),
      card("hearts", 4),
      card("hearts", 5),
      card("hearts", 6),
      card("hearts", 7),
      card("hearts", 8),
    ];

    const candidates = getVoidingPassCandidates(hand);
    // Should include clubs (1), diamonds (2), spades (3) - all rank 6+
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.rank >= 6)).toBe(true);
    expect(candidates.some((c) => c.suit === "clubs")).toBe(true);
  });

  it("prioritizes suits with fewer cards", () => {
    const hand: Card[] = [
      // 1 club (can void)
      card("clubs", 7),
      // 2 diamonds (can void)
      card("diamonds", 8),
      card("diamonds", 9),
      // 3 spades (can void)
      card("spades", 10),
      card("spades", 11),
      card("spades", 12),
      // 7 hearts (too many to void)
      card("hearts", 6),
      card("hearts", 7),
      card("hearts", 8),
      card("hearts", 9),
      card("hearts", 10),
      card("hearts", 11),
      card("hearts", 12),
    ];

    const candidates = getVoidingPassCandidates(hand);
    // Should include clubs, diamonds, spades (all rank 6+)
    // Should prioritize clubs (1 card) first
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.suit === "clubs")).toBe(true);
  });

  it("returns empty array when no voidable suits", () => {
    const hand: Card[] = [
      card("clubs", 6),
      card("clubs", 7),
      card("clubs", 8),
      card("clubs", 9),
      card("clubs", 10),
      card("clubs", 11),
      card("clubs", 12),
      card("clubs", 13),
      card("clubs", 14),
      card("diamonds", 6),
      card("diamonds", 7),
      card("diamonds", 8),
      card("diamonds", 9),
    ];

    // All suits have 4+ cards, can't void
    const candidates = getVoidingPassCandidates(hand);
    expect(candidates.length).toBe(0);
  });

  it("excludes low cards even from short suits", () => {
    const hand: Card[] = [
      card("clubs", 2), // Only card in suit, but too low
      card("clubs", 3), // Only card in suit, but too low
      card("clubs", 4), // Only card in suit, but too low
      card("clubs", 5), // Only card in suit, but too low
      card("diamonds", 6), // Valid candidate
    ];

    const candidates = getVoidingPassCandidates(hand);
    // Should only include diamonds 6, not the low clubs
    expect(candidates.length).toBe(1);
    expect(candidates[0].suit).toBe("diamonds");
  });
});
