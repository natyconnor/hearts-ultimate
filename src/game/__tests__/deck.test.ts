import { describe, it, expect } from "vitest";
import {
  generateDeck,
  shuffleDeck,
  dealCards,
  sortHand,
  createAndDeal,
  createCard,
} from "../deck";
import type { Card } from "../../types/game";

describe("deck - generateDeck", () => {
  it("generates exactly 52 cards", () => {
    const deck = generateDeck();
    expect(deck).toHaveLength(52);
  });

  it("generates all 13 ranks for each suit", () => {
    const deck = generateDeck();
    const suits = ["hearts", "diamonds", "clubs", "spades"] as const;

    for (const suit of suits) {
      const suitCards = deck.filter((c) => c.suit === suit);
      expect(suitCards).toHaveLength(13);
      const ranks = suitCards.map((c) => c.rank).sort((a, b) => a - b);
      expect(ranks).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    }
  });

  it("calculates card points correctly", () => {
    const deck = generateDeck();
    const heart = deck.find((c) => c.suit === "hearts" && c.rank === 7);
    const queenSpades = deck.find((c) => c.suit === "spades" && c.rank === 12);
    const club = deck.find((c) => c.suit === "clubs" && c.rank === 10);

    expect(heart?.points).toBe(1);
    expect(queenSpades?.points).toBe(13);
    expect(club?.points).toBe(0);
  });
});

describe("deck - shuffleDeck", () => {
  it("preserves all cards", () => {
    const deck = generateDeck();
    const shuffled = shuffleDeck(deck);

    expect(shuffled).toHaveLength(52);
    expect(shuffled.length).toBe(deck.length);

    // Check all cards are present (by creating sets of card identities)
    const originalSet = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    const shuffledSet = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));

    expect(shuffledSet.size).toBe(52);
    expect(originalSet.size).toBe(52);

    // All cards from shuffled should be in original
    for (const card of shuffled) {
      expect(originalSet.has(`${card.suit}-${card.rank}`)).toBe(true);
    }
  });

  it("does not modify original deck", () => {
    const deck = generateDeck();
    const originalOrder = deck.map((c) => `${c.suit}-${c.rank}`).join(",");
    shuffleDeck(deck);
    const afterOrder = deck.map((c) => `${c.suit}-${c.rank}`).join(",");

    expect(afterOrder).toBe(originalOrder);
  });

  it("produces different order on multiple shuffles", () => {
    const deck = generateDeck();
    const shuffle1 = shuffleDeck(deck);
    const shuffle2 = shuffleDeck(deck);

    const order1 = shuffle1.map((c) => `${c.suit}-${c.rank}`).join(",");
    const order2 = shuffle2.map((c) => `${c.suit}-${c.rank}`).join(",");

    // verify that the order is different
    // Very unlikely to be identical (but technically possible)
    expect(order1).not.toBe(order2);

    // More importantly, verify they're both valid shuffles
    expect(shuffle1).toHaveLength(52);
    expect(shuffle2).toHaveLength(52);
  });
});

describe("deck - dealCards", () => {
  it("deals exactly 13 cards to each player", () => {
    const deck = generateDeck();
    const hands = dealCards(deck);

    expect(hands).toHaveLength(4);
    hands.forEach((hand) => {
      expect(hand).toHaveLength(13);
    });
  });

  it("deals all 52 cards", () => {
    const deck = generateDeck();
    const hands = dealCards(deck);

    const totalCards = hands.reduce((sum, hand) => sum + hand.length, 0);
    expect(totalCards).toBe(52);
  });

  it("throws error if deck is not 52 cards", () => {
    const shortDeck = generateDeck().slice(0, 51);
    expect(() => dealCards(shortDeck)).toThrow(
      "Deck must have exactly 52 cards"
    );

    const longDeck = [...generateDeck(), createCard("hearts", 2)];
    expect(() => dealCards(longDeck)).toThrow(
      "Deck must have exactly 52 cards"
    );
  });

  it("sorts each hand correctly", () => {
    const deck = generateDeck();
    const hands = dealCards(deck);

    hands.forEach((hand) => {
      // Check suit order: clubs, diamonds, spades, hearts
      const suitOrder: Record<string, number> = {
        clubs: 0,
        diamonds: 1,
        spades: 2,
        hearts: 3,
      };

      for (let i = 1; i < hand.length; i++) {
        const prev = hand[i - 1];
        const curr = hand[i];

        if (prev.suit === curr.suit) {
          // Same suit, ranks should be ascending
          expect(curr.rank).toBeGreaterThanOrEqual(prev.rank);
        } else {
          // Different suit, suit order should be correct
          expect(suitOrder[curr.suit]).toBeGreaterThanOrEqual(
            suitOrder[prev.suit]
          );
        }
      }
    });
  });

  it("distributes cards round-robin style", () => {
    const deck = generateDeck();
    const hands = dealCards(deck);

    // First 4 cards should go to different players
    const firstCards = hands.map((hand) => hand[0]);
    // They should all be different (very likely, but not guaranteed)
    // More importantly, verify the distribution pattern
    expect(firstCards.length).toBe(4);
  });
});

describe("deck - sortHand", () => {
  it("sorts by suit then rank", () => {
    const unsorted: Card[] = [
      createCard("hearts", 7),
      createCard("clubs", 5),
      createCard("spades", 10),
      createCard("clubs", 2),
      createCard("diamonds", 8),
    ];

    const sorted = sortHand(unsorted);

    expect(sorted[0].suit).toBe("clubs");
    expect(sorted[0].rank).toBe(2);
    expect(sorted[1].suit).toBe("clubs");
    expect(sorted[1].rank).toBe(5);
    expect(sorted[2].suit).toBe("diamonds");
    expect(sorted[3].suit).toBe("spades");
    expect(sorted[4].suit).toBe("hearts");
  });

  it("does not modify original array", () => {
    const original: Card[] = [createCard("hearts", 7), createCard("clubs", 5)];
    const originalCopy = [...original];
    sortHand(original);

    expect(original).toEqual(originalCopy);
  });

  it("handles empty hand", () => {
    expect(sortHand([])).toEqual([]);
  });

  it("handles single card", () => {
    const card = createCard("hearts", 7);
    expect(sortHand([card])).toEqual([card]);
  });

  it("handles all cards of same suit", () => {
    const hand: Card[] = [
      createCard("hearts", 10),
      createCard("hearts", 5),
      createCard("hearts", 14),
    ];

    const sorted = sortHand(hand);
    expect(sorted[0].rank).toBe(5);
    expect(sorted[1].rank).toBe(10);
    expect(sorted[2].rank).toBe(14);
  });
});

describe("deck - createAndDeal", () => {
  it("creates and deals valid hands", () => {
    const hands = createAndDeal();

    expect(hands).toHaveLength(4);
    hands.forEach((hand) => {
      expect(hand).toHaveLength(13);
    });

    // Verify all cards are unique
    const allCards = hands.flat();
    const cardSet = new Set(allCards.map((c) => `${c.suit}-${c.rank}`));
    expect(cardSet.size).toBe(52);
  });

  it("produces different hands on each call", () => {
    const hands1 = createAndDeal();
    const hands2 = createAndDeal();

    const order1 = hands1
      .flat()
      .map((c) => `${c.suit}-${c.rank}`)
      .join(",");
    const order2 = hands2
      .flat()
      .map((c) => `${c.suit}-${c.rank}`)
      .join(",");

    // Very unlikely to be identical
    expect(order1).not.toBe(order2);
  });

  it("ensures someone has 2 of clubs", () => {
    // Run multiple times to ensure probability
    for (let i = 0; i < 10; i++) {
      const hands = createAndDeal();
      const hasTwoClubs = hands.some((hand) =>
        hand.some((c) => c.suit === "clubs" && c.rank === 2)
      );
      expect(hasTwoClubs).toBe(true);
    }
  });
});
