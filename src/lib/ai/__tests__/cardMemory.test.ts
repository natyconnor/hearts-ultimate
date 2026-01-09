import { describe, it, expect, beforeEach } from "vitest";
import { CardMemory } from "../memory/cardMemory";
import { createCard } from "../../../game/deck";
import type { Card, CardRank, CardSuit } from "../../../types/game";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  createCard(suit, rank);

describe("CardMemory - basic operations", () => {
  let memory: CardMemory;

  beforeEach(() => {
    memory = new CardMemory(7); // 7 trick memory window
  });

  it("starts empty", () => {
    expect(memory.getRememberedCards()).toHaveLength(0);
    expect(memory.getStats().totalRemembered).toBe(0);
  });

  it("records a trick", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("clubs", 7) },
      { playerId: "p3", card: card("clubs", 10) },
      { playerId: "p4", card: card("hearts", 2) },
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
      ["p3", 2],
      ["p4", 3],
    ]);

    memory.recordTrick(trick, playerIndices, "clubs", "p3");

    const remembered = memory.getRememberedCards();
    expect(remembered).toHaveLength(4);
    expect(remembered[0].card).toEqual(card("clubs", 5));
    expect(remembered[3].card).toEqual(card("hearts", 2));
    expect(remembered[3].wasVoidPlay).toBe(true);
  });

  it("tracks void suits", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("hearts", 7) }, // Void play
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    memory.recordTrick(trick, playerIndices, "clubs");

    expect(memory.isPlayerVoid("p2", "clubs")).toBe(true);
    expect(memory.isPlayerVoid("p1", "clubs")).toBe(false);
    expect(memory.getPlayerVoids("p2")).toContain("clubs");
  });

  it("checks if card was played", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 12) }, // Queen of Spades
    ];
    const playerIndices = new Map([["p1", 0]]);

    memory.recordTrick(trick, playerIndices, "spades");

    expect(memory.isCardPlayed({ suit: "spades", rank: 12 })).toBe(true);
    expect(memory.isCardPlayed({ suit: "spades", rank: 11 })).toBe(false);
    expect(memory.isQueenOfSpadesPlayed()).toBe(true);
  });

  it("tracks who played Queen of Spades", () => {
    const trick = [{ playerId: "p2", card: card("spades", 12) }];
    const playerIndices = new Map([["p2", 1]]);

    memory.recordTrick(trick, playerIndices, "spades");

    expect(memory.whoPlayedQueenOfSpades()).toBe("p2");
  });
});

describe("CardMemory - memory pruning", () => {
  it("prunes old memories beyond window", () => {
    const memory = new CardMemory(3); // Only remember 3 tricks

    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
      ["p3", 2],
      ["p4", 3],
    ]);

    // Record 5 tricks
    for (let i = 0; i < 5; i++) {
      const trick = [
        { playerId: "p1", card: card("clubs", (2 + i) as CardRank) },
        { playerId: "p2", card: card("clubs", (3 + i) as CardRank) },
        { playerId: "p3", card: card("clubs", (4 + i) as CardRank) },
        { playerId: "p4", card: card("clubs", (5 + i) as CardRank) },
      ];
      memory.recordTrick(trick, playerIndices, "clubs");
    }

    // Should only remember last 3 tricks (12 cards)
    const remembered = memory.getRememberedCards();
    expect(remembered.length).toBeLessThanOrEqual(12);
    expect(remembered.length).toBeGreaterThanOrEqual(8); // At least 2 tricks

    // Cards from first trick should be pruned
    const hasFirstTrickCard = remembered.some(
      (m) => m.card.rank === 2 && m.trickNumber === 0
    );
    expect(hasFirstTrickCard).toBe(false);
  });

  it("maintains ~50% retention with default window", () => {
    const memory = new CardMemory(7); // Default window

    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
      ["p3", 2],
      ["p4", 3],
    ]);

    // Record 13 tricks (full round)
    // Use different suits and wrap ranks to stay within valid range (2-14)
    const suits: CardSuit[] = ["clubs", "diamonds", "spades", "hearts"];
    for (let i = 0; i < 13; i++) {
      const suit = suits[i % 4];
      // Use ranks 2-14, wrapping around using modulo
      // Valid ranks are 2-14 (13 possible ranks), so we use modulo 13 and add 2
      // Formula: ((base - 2 + i) % 13) + 2 cycles through 2-14
      const rank1 = ((2 - 2 + i) % 13) + 2; // Cycles 2-14
      const rank2 = ((3 - 2 + i) % 13) + 2; // Cycles 2-14
      const rank3 = ((4 - 2 + i) % 13) + 2; // Cycles 2-14
      const rank4 = ((5 - 2 + i) % 13) + 2; // Cycles 2-14
      const trick = [
        { playerId: "p1", card: card(suit, rank1 as CardRank) },
        { playerId: "p2", card: card(suit, rank2 as CardRank) },
        { playerId: "p3", card: card(suit, rank3 as CardRank) },
        { playerId: "p4", card: card(suit, rank4 as CardRank) },
      ];
      memory.recordTrick(trick, playerIndices, suit);
    }

    const remembered = memory.getRememberedCards();
    // Should remember roughly last 7 tricks (28 cards) out of 52 total
    // That's ~54% retention, close to 50%
    expect(remembered.length).toBeLessThanOrEqual(28);
    expect(remembered.length).toBeGreaterThanOrEqual(20);
  });
});

describe("CardMemory - moon behavior tracking", () => {
  let memory: CardMemory;

  beforeEach(() => {
    memory = new CardMemory();
  });

  it("tracks Queen of Spades lead", () => {
    const trick = [
      { playerId: "p1", card: card("spades", 12) }, // Leading Q♠
      { playerId: "p2", card: card("spades", 5) },
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    memory.recordTrick(trick, playerIndices, "spades");

    const behavior = memory.getMoonBehavior("p1");
    expect(behavior.ledQueenOfSpades).toBe(true);
  });

  it("tracks high card leads", () => {
    const tricks = [
      [
        { playerId: "p1", card: card("clubs", 12) }, // Q
        { playerId: "p2", card: card("clubs", 5) },
      ],
      [
        { playerId: "p1", card: card("hearts", 14) }, // A
        { playerId: "p2", card: card("hearts", 5) },
      ],
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    for (const trick of tricks) {
      memory.recordTrick(trick, playerIndices, trick[0].card.suit);
    }

    const behavior = memory.getMoonBehavior("p1");
    expect(behavior.highCardLeads).toBe(2);
  });

  it("tracks hearts won", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("hearts", 7) },
      { playerId: "p3", card: card("hearts", 10) },
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
      ["p3", 2],
    ]);

    memory.recordTrick(trick, playerIndices, "clubs", "p1");

    const behavior = memory.getMoonBehavior("p1");
    expect(behavior.heartsWon).toBe(2); // Won 2 hearts
  });

  it("tracks voluntary wins with penalties", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("clubs", 7) },
      { playerId: "p3", card: card("hearts", 10) }, // Penalty card
      { playerId: "p4", card: card("clubs", 10) }, // Wins voluntarily
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
      ["p3", 2],
      ["p4", 3],
    ]);

    memory.recordTrick(trick, playerIndices, "clubs", "p4");

    const behavior = memory.getMoonBehavior("p4");
    expect(behavior.voluntaryWins).toBe(1);
  });

  it("tracks missed dump opportunities", () => {
    const trick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("diamonds", 6) }, // Void play, low non-penalty
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    memory.recordTrick(trick, playerIndices, "clubs");

    const behavior = memory.getMoonBehavior("p2");
    expect(behavior.missedDumpOpportunities).toBe(1);
  });

  it("calculates suspicion scores", () => {
    const tricks = [
      [
        { playerId: "p1", card: card("spades", 12) }, // Q♠ lead
        { playerId: "p2", card: card("spades", 5) },
      ],
      [
        { playerId: "p1", card: card("clubs", 14) }, // High lead
        { playerId: "p2", card: card("clubs", 5) },
      ],
    ];
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    for (const trick of tricks) {
      memory.recordTrick(trick, playerIndices, trick[0].card.suit);
    }

    const suspects = memory.getSuspiciousMoonPlayers();
    expect(suspects.length).toBeGreaterThan(0);
    const p1Suspect = suspects.find((s) => s.playerId === "p1");
    expect(p1Suspect).toBeDefined();
    expect(p1Suspect!.suspicionScore).toBeGreaterThan(0);
  });
});

describe("CardMemory - unseen cards", () => {
  let memory: CardMemory;

  beforeEach(() => {
    memory = new CardMemory();
  });

  it("tracks unseen high cards", () => {
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    // Play some high spades
    const trick1 = [
      { playerId: "p1", card: card("spades", 12) }, // Q
      { playerId: "p2", card: card("spades", 5) },
    ];
    memory.recordTrick(trick1, playerIndices, "spades");

    const unseen = memory.getUnseenHighCards("spades", 11);
    expect(unseen.length).toBeLessThan(4); // J, K, A should remain (Q played)
    expect(unseen.some((c) => c.rank === 12)).toBe(false); // Q is played
  });

  it("checks if player might have high cards", () => {
    const playerIndices = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);

    // Player 1 plays low spades
    const trick = [
      { playerId: "p1", card: card("spades", 5) },
      { playerId: "p2", card: card("spades", 7) },
    ];
    memory.recordTrick(trick, playerIndices, "spades");

    expect(memory.mightHaveHighCards("p1", "spades")).toBe(true);
    expect(memory.mightHaveHighCards("p2", "spades")).toBe(true);

    // If player is void, can't have high cards
    const voidTrick = [
      { playerId: "p1", card: card("clubs", 5) },
      { playerId: "p2", card: card("hearts", 7) }, // Void
    ];
    memory.recordTrick(voidTrick, playerIndices, "clubs");

    expect(memory.mightHaveHighCards("p2", "clubs")).toBe(false);
  });
});

describe("CardMemory - reset", () => {
  it("clears all memory", () => {
    const memory = new CardMemory();
    const playerIndices = new Map([["p1", 0]]);

    memory.recordTrick(
      [{ playerId: "p1", card: card("clubs", 5) }],
      playerIndices,
      "clubs"
    );

    expect(memory.getRememberedCards().length).toBeGreaterThan(0);

    memory.reset();

    expect(memory.getRememberedCards()).toHaveLength(0);
    expect(memory.getStats().totalRemembered).toBe(0);
    expect(memory.getPlayerVoids("p1")).toHaveLength(0);
  });
});
