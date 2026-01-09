/**
 * Tests for moon shooting evaluation logic
 */

import { describe, it, expect } from "vitest";
import { evaluateMoonPotential, scoreMoonPassCards } from "../strategies/hard/moonEvaluation";
import type { Card } from "../../../types/game";

// Helper to create cards quickly
const card = (suit: Card["suit"], rank: Card["rank"]): Card => ({
  suit,
  rank,
  points: suit === "hearts" ? 1 : suit === "spades" && rank === 12 ? 13 : 0,
});

describe("evaluateMoonPotential", () => {
  describe("strong moon hands", () => {
    it("should identify a classic moon hand with A♥, Q♠, and high cards", () => {
      const hand: Card[] = [
        card("hearts", 14), // A♥ - critical
        card("spades", 12), // Q♠ - critical
        card("spades", 14), // A♠
        card("spades", 13), // K♠
        card("hearts", 13), // K♥
        card("hearts", 12), // Q♥
        card("clubs", 14), // A♣
        card("clubs", 13), // K♣
        card("diamonds", 14), // A♦
        card("diamonds", 13), // K♦
        card("diamonds", 12), // Q♦
        card("clubs", 12), // Q♣
        card("hearts", 11), // J♥
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(true);
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.reasons).toContain("Has A♥ (critical)");
      expect(result.reasons).toContain("Has Q♠");
    });

    it("should identify a hand with A♠+K♠ that can catch Q♠", () => {
      const hand: Card[] = [
        card("hearts", 14), // A♥ - critical
        card("spades", 14), // A♠ - can catch Q♠
        card("spades", 13), // K♠ - can catch Q♠
        card("hearts", 13), // K♥
        card("hearts", 12), // Q♥
        card("hearts", 11), // J♥
        card("hearts", 10), // 10♥
        card("clubs", 14), // A♣
        card("clubs", 13), // K♣
        card("diamonds", 14), // A♦
        card("diamonds", 13), // K♦
        card("diamonds", 12), // Q♦
        card("clubs", 12), // Q♣
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(true);
      expect(result.reasons).toContain("Has A♠+K♠ (can catch Q♠)");
    });

    it("should recognize a long hearts hand (7+ hearts)", () => {
      const hand: Card[] = [
        card("hearts", 14), // A♥
        card("hearts", 13), // K♥
        card("hearts", 12), // Q♥
        card("hearts", 11), // J♥
        card("hearts", 10), // 10♥
        card("hearts", 9), // 9♥
        card("hearts", 8), // 8♥
        card("spades", 12), // Q♠
        card("spades", 14), // A♠
        card("clubs", 14), // A♣
        card("clubs", 13), // K♣
        card("diamonds", 14), // A♦
        card("diamonds", 13), // K♦
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(true);
      expect(result.reasons.some((r) => r.includes("hearts"))).toBe(true);
    });
  });

  describe("weak moon hands", () => {
    it("should NOT attempt without A♥", () => {
      const hand: Card[] = [
        card("hearts", 13), // K♥ - not A♥!
        card("spades", 12), // Q♠
        card("spades", 14), // A♠
        card("spades", 13), // K♠
        card("hearts", 12), // Q♥
        card("hearts", 11), // J♥
        card("clubs", 14), // A♣
        card("clubs", 13), // K♣
        card("diamonds", 14), // A♦
        card("diamonds", 13), // K♦
        card("diamonds", 12), // Q♦
        card("clubs", 12), // Q♣
        card("clubs", 11), // J♣
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(false);
      expect(result.reasons).toContain("Missing A♥ (very risky)");
    });

    it("should NOT attempt without Q♠ control (no Q♠, A♠, or K♠)", () => {
      const hand: Card[] = [
        card("hearts", 14), // A♥
        card("hearts", 13), // K♥
        card("hearts", 12), // Q♥
        card("spades", 5), // 5♠ - no control!
        card("spades", 4), // 4♠
        card("clubs", 14), // A♣
        card("clubs", 13), // K♣
        card("clubs", 12), // Q♣
        card("diamonds", 14), // A♦
        card("diamonds", 13), // K♦
        card("diamonds", 12), // Q♦
        card("diamonds", 11), // J♦
        card("clubs", 11), // J♣
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(false);
      expect(result.reasons).toContain("No Q♠ control (dangerous)");
    });

    it("should NOT attempt with too many low cards", () => {
      const hand: Card[] = [
        card("hearts", 14), // A♥
        card("spades", 12), // Q♠
        card("hearts", 2), // 2♥ - low
        card("hearts", 3), // 3♥ - low
        card("clubs", 2), // 2♣ - low
        card("clubs", 3), // 3♣ - low
        card("diamonds", 2), // 2♦ - low
        card("diamonds", 3), // 3♦ - low
        card("spades", 2), // 2♠ - low
        card("spades", 3), // 3♠ - low
        card("clubs", 4), // 4♣ - low
        card("diamonds", 4), // 4♦ - low
        card("hearts", 4), // 4♥ - low
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(false);
      expect(result.reasons.some((r) => r.includes("low cards"))).toBe(true);
    });

    it("should NOT attempt with an average hand", () => {
      const hand: Card[] = [
        card("hearts", 10), // 10♥
        card("hearts", 7), // 7♥
        card("hearts", 4), // 4♥
        card("spades", 9), // 9♠
        card("spades", 6), // 6♠
        card("spades", 3), // 3♠
        card("clubs", 11), // J♣
        card("clubs", 8), // 8♣
        card("clubs", 5), // 5♣
        card("clubs", 2), // 2♣
        card("diamonds", 10), // 10♦
        card("diamonds", 6), // 6♦
        card("diamonds", 3), // 3♦
      ];

      const result = evaluateMoonPotential(hand);

      expect(result.shouldAttempt).toBe(false);
      expect(result.confidence).toBeLessThan(50);
    });
  });

  describe("edge cases", () => {
    it("should value having Q♠ highly", () => {
      const handWithQueen: Card[] = [
        card("hearts", 14),
        card("spades", 12), // Has Q♠
        card("hearts", 13),
        card("hearts", 12),
        card("clubs", 14),
        card("clubs", 13),
        card("diamonds", 14),
        card("diamonds", 13),
        card("spades", 10),
        card("spades", 9),
        card("clubs", 10),
        card("diamonds", 10),
        card("hearts", 10),
      ];

      const handWithoutQueen: Card[] = [
        card("hearts", 14),
        card("spades", 10), // No Q♠ or high spades
        card("hearts", 13),
        card("hearts", 12),
        card("clubs", 14),
        card("clubs", 13),
        card("diamonds", 14),
        card("diamonds", 13),
        card("spades", 9),
        card("spades", 8),
        card("clubs", 10),
        card("diamonds", 10),
        card("hearts", 10),
      ];

      const withQueen = evaluateMoonPotential(handWithQueen);
      const withoutQueen = evaluateMoonPotential(handWithoutQueen);

      expect(withQueen.score).toBeGreaterThan(withoutQueen.score);
    });
  });
});

describe("scoreMoonPassCards", () => {
  it("should prefer passing low cards when shooting", () => {
    const hand: Card[] = [
      card("hearts", 14), // A♥ - KEEP
      card("spades", 12), // Q♠ - KEEP
      card("hearts", 2), // 2♥ - should PASS
      card("clubs", 3), // 3♣ - should PASS
      card("diamonds", 4), // 4♦ - should PASS
      card("spades", 14), // A♠ - KEEP
      card("clubs", 14), // A♣ - KEEP
      card("diamonds", 14), // A♦ - KEEP
      card("hearts", 13), // K♥ - KEEP
      card("clubs", 13), // K♣ - KEEP
      card("diamonds", 13), // K♦ - KEEP
      card("hearts", 12), // Q♥ - KEEP
      card("clubs", 12), // Q♣ - KEEP
    ];

    const scored = scoreMoonPassCards(hand);
    scored.sort((a, b) => b.score - a.score);

    // Top 3 should be low cards
    const top3 = scored.slice(0, 3);
    expect(top3.every((s) => s.card.rank <= 5)).toBe(true);
  });

  it("should NEVER pass A♥ when shooting", () => {
    const hand: Card[] = [
      card("hearts", 14), // A♥
      card("hearts", 2),
      card("hearts", 3),
      card("clubs", 2),
      card("clubs", 3),
      card("diamonds", 2),
      card("diamonds", 3),
      card("spades", 2),
      card("spades", 3),
      card("clubs", 4),
      card("diamonds", 4),
      card("hearts", 4),
      card("spades", 4),
    ];

    const scored = scoreMoonPassCards(hand);
    const aceOfHearts = scored.find(
      (s) => s.card.suit === "hearts" && s.card.rank === 14
    );

    expect(aceOfHearts).toBeDefined();
    expect(aceOfHearts!.score).toBeLessThan(-100); // Strong negative
  });

  it("should NEVER pass Q♠ when shooting", () => {
    const hand: Card[] = [
      card("spades", 12), // Q♠
      card("hearts", 2),
      card("hearts", 3),
      card("clubs", 2),
      card("clubs", 3),
      card("diamonds", 2),
      card("diamonds", 3),
      card("spades", 2),
      card("spades", 3),
      card("clubs", 4),
      card("diamonds", 4),
      card("hearts", 4),
      card("spades", 4),
    ];

    const scored = scoreMoonPassCards(hand);
    const queenOfSpades = scored.find(
      (s) => s.card.suit === "spades" && s.card.rank === 12
    );

    expect(queenOfSpades).toBeDefined();
    expect(queenOfSpades!.score).toBeLessThan(-100); // Strong negative
  });
});

