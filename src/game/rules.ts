import type { Card, CardSuit, GameState } from "../types/game";
import { cardsEqual } from "./cardDisplay";

/**
 * Hearts game rules and validation logic
 */

/**
 * Checks if a card is the 2 of clubs
 */
export function isTwoOfClubs(card: Card): boolean {
  return card.suit === "clubs" && card.rank === 2;
}

/**
 * Checks if a card is a heart
 */
export function isHeart(card: Card): boolean {
  return card.suit === "hearts";
}

/**
 * Checks if a card is the Queen of Spades
 */
export function isQueenOfSpades(card: Card): boolean {
  return card.suit === "spades" && card.rank === 12;
}

/**
 * Checks if a card is a penalty card (heart or Queen of Spades)
 */
export function isPenaltyCard(card: Card): boolean {
  return isHeart(card) || isQueenOfSpades(card);
}

/**
 * Gets the lead suit from the current trick
 */
export function getLeadSuit(
  trick: Array<{ playerId: string; card: Card }>
): CardSuit | null {
  if (trick.length === 0) return null;
  return trick[0].card.suit;
}

/**
 * Checks if a player has any cards of a specific suit in their hand
 */
export function hasSuit(hand: Card[], suit: CardSuit): boolean {
  return hand.some((card) => card.suit === suit);
}

/**
 * Checks if a player has any non-penalty cards (non-hearts, non-Queen of Spades)
 */
export function hasNonPenaltyCards(hand: Card[]): boolean {
  return hand.some((card) => !isPenaltyCard(card));
}

/**
 * Validates if a card can be played according to Hearts rules
 */
export function canPlayCard(
  card: Card,
  hand: Card[],
  trick: Array<{ playerId: string; card: Card }>,
  heartsBroken: boolean,
  isFirstTrick: boolean
): { valid: boolean; reason?: string } {
  // Check if card is in hand
  const cardInHand = hand.some((c) => cardsEqual(c, card));
  if (!cardInHand) {
    return { valid: false, reason: "Card not in hand" };
  }

  // First trick rules
  if (isFirstTrick) {
    // First card must be 2 of clubs
    if (trick.length === 0) {
      if (!isTwoOfClubs(card)) {
        return {
          valid: false,
          reason: "First trick must start with 2 of clubs",
        };
      }
      return { valid: true };
    }

    // In first trick, cannot play hearts or Queen of Spades
    if (isPenaltyCard(card)) {
      return {
        valid: false,
        reason: "Cannot play cards worth points in the first trick",
      };
    }
  }

  // Follow suit rules
  const leadSuit = getLeadSuit(trick);
  if (leadSuit) {
    // Must follow suit if possible
    if (hasSuit(hand, leadSuit)) {
      if (card.suit !== leadSuit) {
        return {
          valid: false,
          reason: `Must follow suit (${leadSuit})`,
        };
      }
    }
  } else {
    // Leading a trick
    // Cannot lead hearts unless hearts are broken
    if (isHeart(card) && !heartsBroken) {
      // Exception: if player only has hearts, they can lead hearts
      const onlyHearts = hand.every((c) => isHeart(c));
      if (!onlyHearts) {
        return {
          valid: false,
          reason:
            "Hearts cannot be led until hearts are broken (or you are out of all other suits)",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Gets all valid cards that can be played
 */
export function getValidCards(
  hand: Card[],
  trick: Array<{ playerId: string; card: Card }>,
  heartsBroken: boolean,
  isFirstTrick: boolean
): Card[] {
  return hand.filter((card) => {
    const result = canPlayCard(card, hand, trick, heartsBroken, isFirstTrick);
    return result.valid;
  });
}

/**
 * Determines the winner of a trick
 * Returns the index of the winning card in the trick array
 */
export function getTrickWinner(
  trick: Array<{ playerId: string; card: Card }>
): number {
  if (trick.length === 0) {
    throw new Error("Cannot determine winner of empty trick");
  }

  const leadSuit = trick[0].card.suit;
  let winnerIndex = 0;
  let highestRank = trick[0].card.rank;

  // Find highest card of lead suit
  for (let i = 1; i < trick.length; i++) {
    if (trick[i].card.suit === leadSuit && trick[i].card.rank > highestRank) {
      highestRank = trick[i].card.rank;
      winnerIndex = i;
    }
  }

  return winnerIndex;
}

/**
 * Calculates points for a trick
 * Returns an object mapping playerId to points
 */
export function calculateTrickPoints(
  trick: Array<{ playerId: string; card: Card }>
): Record<string, number> {
  const points: Record<string, number> = {};

  trick.forEach(({ playerId, card }) => {
    points[playerId] = points[playerId] || 0;
    // Use the card's built-in point value
    points[playerId] += card.points;
  });

  return points;
}

/**
 * Checks if hearts should be marked as broken after playing a card
 */
export function shouldBreakHearts(card: Card, heartsBroken: boolean): boolean {
  if (heartsBroken) return true;
  return isHeart(card);
}

/**
 * Checks if a round is complete (all players have no cards left)
 */
export function isRoundComplete(gameState: GameState): boolean {
  return gameState.players.every((player) => player.hand.length === 0);
}

/**
 * Checks if shooting the moon occurred (one player took all 26 points)
 */
export function checkShootingTheMoon(roundScores: number[]): {
  shot: boolean;
  playerIndex?: number;
} {
  const totalPoints = roundScores.reduce((sum, score) => sum + score, 0);

  // If total is 26, someone shot the moon
  if (totalPoints === 26) {
    const moonShooterIndex = roundScores.findIndex((score) => score === 26);
    if (moonShooterIndex !== -1) {
      return { shot: true, playerIndex: moonShooterIndex };
    }
  }

  return { shot: false };
}

/**
 * Applies shooting the moon scoring
 * If a player shot the moon, they get 0 points and others get 26
 */
export function applyShootingTheMoon(
  roundScores: number[],
  moonShooterIndex: number
): number[] {
  const newScores = roundScores.map((_, index) =>
    index === moonShooterIndex ? 0 : 26
  );
  return newScores;
}

/**
 * Gets the next player index in turn order
 */
export function getNextPlayerIndex(
  currentIndex: number,
  totalPlayers: number
): number {
  return (currentIndex + 1) % totalPlayers;
}

/**
 * Finds the player index who has the 2 of clubs (for first trick)
 */
export function findPlayerWithTwoOfClubs(gameState: GameState): number {
  for (let i = 0; i < gameState.players.length; i++) {
    const player = gameState.players[i];
    if (player.hand.some(isTwoOfClubs)) {
      return i;
    }
  }
  throw new Error("No player has the 2 of clubs");
}

/**
 * Checks if it's the first trick of the round
 */
export function isFirstTrick(gameState: GameState): boolean {
  // First trick if currentTrickNumber is 1 (or undefined for backwards compatibility)
  return (gameState.currentTrickNumber ?? 1) === 1;
}
