import type { Card, CardSuit, CardRank } from "../types/game";

const SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: CardRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * Calculate the penalty points for a card based on suit and rank.
 * Hearts = 1 point each, Queen of Spades = 13 points, all others = 0
 */
export function getCardPoints(suit: CardSuit, rank: CardRank): number {
  if (suit === "hearts") return 1;
  if (suit === "spades" && rank === 12) return 13; // Queen of Spades
  return 0;
}

/**
 * Create a card with its point value automatically calculated.
 * Convenience function for creating cards with proper points.
 */
export function createCard(suit: CardSuit, rank: CardRank): Card {
  return { suit, rank, points: getCardPoints(suit, rank) };
}

/**
 * Suit order for sorting: clubs, diamonds, spades, hearts
 */
const SUIT_ORDER: Record<CardSuit, number> = {
  clubs: 0,
  diamonds: 1,
  spades: 2,
  hearts: 3,
};

/**
 * Sorts a hand of cards by suit (clubs, diamonds, spades, hearts) then by rank (ascending)
 */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    // First sort by suit
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) {
      return suitDiff;
    }
    // Then sort by rank (ascending)
    return a.rank - b.rank;
  });
}

/**
 * Generates a full 52-card deck
 */
export function generateDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

/**
 * Shuffles a deck of cards using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals 13 cards to each of 4 players from a deck
 * Returns an array of 4 hands (each hand is an array of 13 cards, sorted)
 */
export function dealCards(deck: Card[]): Card[][] {
  if (deck.length !== 52) {
    throw new Error("Deck must have exactly 52 cards");
  }

  const hands: Card[][] = [[], [], [], []];

  for (let i = 0; i < 52; i++) {
    const playerIndex = i % 4;
    hands[playerIndex].push(deck[i]);
  }

  // Sort each hand by suit (clubs, diamonds, spades, hearts) then by rank
  return hands.map((hand) => sortHand(hand));
}

/**
 * Creates a shuffled deck and deals it to 4 players
 * Convenience function that combines generateDeck, shuffleDeck, and dealCards
 */
export function createAndDeal(): Card[][] {
  const deck = generateDeck();
  const shuffled = shuffleDeck(deck);
  const hands = dealCards(shuffled);

  // TEST MODE: Force a moon hand for player at index 1 (first AI)
  // Enable by setting localStorage: localStorage.setItem('TEST_MOON_HAND', 'true')
  // Or change FORCE_MOON_HAND_TEST to true below
  const FORCE_MOON_HAND_TEST = false;
  const testMoonEnabled =
    FORCE_MOON_HAND_TEST ||
    (typeof window !== "undefined" &&
      localStorage.getItem("TEST_MOON_HAND") === "true");

  if (testMoonEnabled) {
    console.log("🌙 TEST MODE: Forcing moon hand for Player 2 (index 1)");
    return createTestMoonHands();
  }

  return hands;
}

// ============================================================================
// TEST MODE: Moon Hand Testing
// ============================================================================

/**
 * Creates hands where Player 2 (index 1) has a BORDERLINE moon-shooting hand.
 * The hand is randomized to be near the decision threshold (~65 score).
 * Sometimes the AI will attempt to shoot, sometimes not.
 *
 * To enable: localStorage.setItem('TEST_MOON_HAND', 'true')
 * To disable: localStorage.removeItem('TEST_MOON_HAND')
 */
export function createTestMoonHands(): Card[][] {
  const moonHand = generateBorderlineMoonHand();

  // Collect all cards in the moon hand for filtering
  const moonCardKeys = new Set(moonHand.map((c) => `${c.suit}-${c.rank}`));

  // Generate remaining cards (excluding moon hand cards)
  const remainingCards: Card[] = [];
  for (const suit of ["hearts", "diamonds", "clubs", "spades"] as CardSuit[]) {
    for (const rank of [
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ] as CardRank[]) {
      const key = `${suit}-${rank}`;
      if (!moonCardKeys.has(key)) {
        remainingCards.push(createCard(suit, rank));
      }
    }
  }

  // Shuffle remaining cards
  const shuffledRemaining = shuffleDeck(remainingCards);

  // Ensure player 0 gets 2♣ (to start the game)
  const twoOfClubsIndex = shuffledRemaining.findIndex(
    (c) => c.suit === "clubs" && c.rank === 2
  );
  if (twoOfClubsIndex > 12) {
    [shuffledRemaining[0], shuffledRemaining[twoOfClubsIndex]] = [
      shuffledRemaining[twoOfClubsIndex],
      shuffledRemaining[0],
    ];
  }

  // Deal remaining 39 cards to players 0, 2, 3 (13 each)
  const hands: Card[][] = [
    sortHand(shuffledRemaining.slice(0, 13)), // Player 0 (human) - has 2♣
    sortHand(moonHand), // Player 1 (AI) - BORDERLINE MOON HAND
    sortHand(shuffledRemaining.slice(13, 26)), // Player 2 (AI)
    sortHand(shuffledRemaining.slice(26, 39)), // Player 3 (AI)
  ];

  return hands;
}

/**
 * Generate a borderline moon hand that's near the decision threshold.
 * ~40-60% chance of triggering a moon attempt.
 */
function generateBorderlineMoonHand(): Card[] {
  const hand: Card[] = [];
  const usedCards = new Set<string>();

  const addCard = (suit: CardSuit, rank: CardRank) => {
    const key = `${suit}-${rank}`;
    if (!usedCards.has(key)) {
      hand.push(createCard(suit, rank));
      usedCards.add(key);
    }
  };

  // Randomly decide critical card configuration
  const config = Math.random();
  let configDesc = "";

  if (config < 0.25) {
    // Config 1: Has A♥ and Q♠ (strong base, but fewer other high cards)
    configDesc = "A♥ + Q♠ (strong base)";
    addCard("hearts", 14); // A♥
    addCard("spades", 12); // Q♠
    // Add 3-4 more high cards
    const highCards = shuffleDeck([
      createCard("hearts", 13),
      createCard("hearts", 12),
      createCard("clubs", 14),
      createCard("diamonds", 14),
      createCard("spades", 14),
    ]).slice(0, 3 + Math.floor(Math.random() * 2));
    highCards.forEach((c) => addCard(c.suit, c.rank));
  } else if (config < 0.5) {
    // Config 2: Has A♥ and A♠+K♠ (can catch Q♠)
    configDesc = "A♥ + A♠K♠ (can catch Q♠)";
    addCard("hearts", 14); // A♥
    addCard("spades", 14); // A♠
    addCard("spades", 13); // K♠
    // Add 2-4 more high cards
    const highCards = shuffleDeck([
      createCard("hearts", 13),
      createCard("hearts", 12),
      createCard("clubs", 14),
      createCard("diamonds", 14),
      createCard("clubs", 13),
    ]).slice(0, 2 + Math.floor(Math.random() * 3));
    highCards.forEach((c) => addCard(c.suit, c.rank));
  } else if (config < 0.75) {
    // Config 3: Has Q♠ but NOT A♥ (risky - borderline fail)
    configDesc = "Q♠ but NO A♥ (risky)";
    addCard("spades", 12); // Q♠
    addCard("hearts", 13); // K♥ (not A♥!)
    addCard("hearts", 12); // Q♥
    // Add 3-5 high cards to maybe compensate
    const highCards = shuffleDeck([
      createCard("spades", 14),
      createCard("spades", 13),
      createCard("clubs", 14),
      createCard("clubs", 13),
      createCard("diamonds", 14),
      createCard("diamonds", 13),
    ]).slice(0, 3 + Math.floor(Math.random() * 3));
    highCards.forEach((c) => addCard(c.suit, c.rank));
  } else {
    // Config 4: Has A♥ but weak spade control (only A♠, no K♠ or Q♠)
    configDesc = "A♥ + A♠ only (weak spade control)";
    addCard("hearts", 14); // A♥
    addCard("spades", 14); // A♠
    // No K♠ or Q♠!
    // Add 3-5 other high cards
    const highCards = shuffleDeck([
      createCard("hearts", 13),
      createCard("hearts", 12),
      createCard("hearts", 11),
      createCard("clubs", 14),
      createCard("clubs", 13),
      createCard("diamonds", 14),
      createCard("diamonds", 13),
    ]).slice(0, 3 + Math.floor(Math.random() * 3));
    highCards.forEach((c) => addCard(c.suit, c.rank));
  }

  // Add some medium cards (7-10) to fill gaps
  const mediumCards = shuffleDeck([
    createCard("hearts", 10),
    createCard("hearts", 9),
    createCard("clubs", 10),
    createCard("clubs", 11),
    createCard("diamonds", 10),
    createCard("diamonds", 11),
    createCard("spades", 10),
    createCard("spades", 11),
  ]);

  // Fill to 13 cards
  let mediumIdx = 0;
  while (hand.length < 13 && mediumIdx < mediumCards.length) {
    const c = mediumCards[mediumIdx];
    if (!usedCards.has(`${c.suit}-${c.rank}`)) {
      addCard(c.suit, c.rank);
    }
    mediumIdx++;
  }

  // If still need cards, add low cards (makes moon harder)
  const lowCards = shuffleDeck([
    createCard("hearts", 5),
    createCard("hearts", 6),
    createCard("clubs", 5),
    createCard("clubs", 6),
    createCard("diamonds", 5),
    createCard("diamonds", 6),
    createCard("spades", 5),
    createCard("spades", 6),
  ]);

  let lowIdx = 0;
  while (hand.length < 13 && lowIdx < lowCards.length) {
    const c = lowCards[lowIdx];
    if (!usedCards.has(`${c.suit}-${c.rank}`)) {
      addCard(c.suit, c.rank);
    }
    lowIdx++;
  }

  // Log the hand for debugging
  const formatCard = (c: Card) => {
    const rankStr =
      c.rank === 14
        ? "A"
        : c.rank === 13
        ? "K"
        : c.rank === 12
        ? "Q"
        : c.rank === 11
        ? "J"
        : c.rank;
    const suitStr = c.suit[0].toUpperCase();
    return `${rankStr}${suitStr}`;
  };

  console.log(`🌙 TEST MODE: Borderline moon hand (${configDesc})`);
  console.log(`   Hand: ${hand.map(formatCard).join(", ")}`);

  return hand;
}
