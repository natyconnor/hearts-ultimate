import type {
  Card,
  GameState,
  PassDirection,
  PassSubmission,
} from "../types/game";
import { sortHand } from "./deck";

/**
 * Card passing logic for Hearts
 * Pass direction rotates each round: left → right → across → none (hold)
 */

/**
 * Gets the pass direction for a given round number
 * Round 1: left, Round 2: right, Round 3: across, Round 4: none (hold)
 * Then repeats...
 */
export function getPassDirection(roundNumber: number): PassDirection {
  const directionIndex = (roundNumber - 1) % 4;
  const directions: PassDirection[] = ["left", "right", "across", "none"];
  return directions[directionIndex];
}

/**
 * Gets the target player index for passing cards
 * @param fromIndex - The player index who is passing
 * @param direction - The pass direction
 * @returns The player index to pass to
 */
export function getPassTargetIndex(
  fromIndex: number,
  direction: PassDirection
): number {
  switch (direction) {
    case "left":
      // Pass to the next player clockwise (index + 1)
      return (fromIndex + 1) % 4;
    case "right":
      // Pass to the previous player (index + 3 = index - 1 mod 4)
      return (fromIndex + 3) % 4;
    case "across":
      // Pass to the player across the table (index + 2)
      return (fromIndex + 2) % 4;
    case "none":
      // No passing - shouldn't be called, but return same index
      return fromIndex;
  }
}

/**
 * Gets the display label for a pass direction
 */
export function getPassDirectionLabel(direction: PassDirection): string {
  switch (direction) {
    case "left":
      return "Pass Left";
    case "right":
      return "Pass Right";
    case "across":
      return "Pass Across";
    case "none":
      return "Hold (No Passing)";
  }
}

/**
 * Gets an emoji/arrow for the pass direction
 */
export function getPassDirectionEmoji(direction: PassDirection): string {
  switch (direction) {
    case "left":
      return "⬅️";
    case "right":
      return "➡️";
    case "across":
      return "⬆️";
    case "none":
      return "✋";
  }
}

/**
 * Validates that the selected cards are valid for passing
 * @param selectedCards - The cards the player wants to pass
 * @param hand - The player's full hand
 * @returns Validation result
 */
export function validatePassSelection(
  selectedCards: Card[],
  hand: Card[]
): { valid: boolean; reason?: string } {
  // Must pass exactly 3 cards
  if (selectedCards.length !== 3) {
    return { valid: false, reason: "Must select exactly 3 cards to pass" };
  }

  // All selected cards must be in hand
  for (const card of selectedCards) {
    const inHand = hand.some(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    if (!inHand) {
      return { valid: false, reason: "Selected card not in hand" };
    }
  }

  // Check for duplicates
  const cardStrings = selectedCards.map((c) => `${c.suit}-${c.rank}`);
  const uniqueCards = new Set(cardStrings);
  if (uniqueCards.size !== 3) {
    return { valid: false, reason: "Cannot pass duplicate cards" };
  }

  return { valid: true };
}

/**
 * Checks if a card is in the selection
 */
export function isCardSelected(card: Card, selectedCards: Card[]): boolean {
  return selectedCards.some(
    (c) => c.suit === card.suit && c.rank === card.rank
  );
}

/**
 * Checks if all players have submitted their passes
 */
export function allPlayersHavePassed(gameState: GameState): boolean {
  if (!gameState.passSubmissions) return false;
  return gameState.passSubmissions.length === 4;
}

/**
 * Checks if a specific player has submitted their pass
 */
export function hasPlayerSubmittedPass(
  gameState: GameState,
  playerId: string
): boolean {
  if (!gameState.passSubmissions) return false;
  return gameState.passSubmissions.some((s) => s.playerId === playerId);
}

/**
 * Submits a player's card selection for passing
 * Returns updated game state with the submission recorded
 */
export function submitPassSelection(
  gameState: GameState,
  playerId: string,
  cards: Card[]
): { gameState: GameState; error?: string } {
  // Validate it's the passing phase
  if (!gameState.isPassingPhase) {
    return { gameState, error: "Not in passing phase" };
  }

  // Validate pass direction is not "none"
  if (gameState.passDirection === "none") {
    return { gameState, error: "No passing this round" };
  }

  // Find the player
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { gameState, error: "Player not found" };
  }

  // Check if player already submitted
  if (hasPlayerSubmittedPass(gameState, playerId)) {
    return { gameState, error: "Already submitted pass selection" };
  }

  // Validate the selection
  const player = gameState.players[playerIndex];
  const validation = validatePassSelection(cards, player.hand);
  if (!validation.valid) {
    return { gameState, error: validation.reason };
  }

  // Add the submission
  const newSubmission: PassSubmission = { playerId, cards };
  const updatedSubmissions = [
    ...(gameState.passSubmissions || []),
    newSubmission,
  ];

  return {
    gameState: {
      ...gameState,
      passSubmissions: updatedSubmissions,
    },
  };
}

/**
 * Executes all passes when all players have submitted
 * Removes cards from each player's hand and adds received cards
 * Returns the updated game state in reveal phase (showing received cards)
 */
export function executePassPhase(gameState: GameState): {
  gameState: GameState;
  error?: string;
} {
  // Validate all submissions are present
  if (!allPlayersHavePassed(gameState)) {
    return { gameState, error: "Not all players have submitted passes" };
  }

  if (!gameState.passDirection || gameState.passDirection === "none") {
    return { gameState, error: "Invalid pass direction" };
  }

  const submissions = gameState.passSubmissions!;
  const direction = gameState.passDirection;

  // Track which cards each player receives (for reveal phase)
  const receivedCards: Card[][] = [[], [], [], []];

  // Create new hands with passed cards removed and received cards added
  const newPlayers = gameState.players.map((player, playerIndex) => {
    const submission = submissions.find((s) => s.playerId === player.id);
    if (!submission) {
      return player; // Shouldn't happen, but safety
    }

    // Remove the cards this player is passing
    let newHand = player.hand.filter(
      (card) =>
        !submission.cards.some(
          (passedCard) =>
            passedCard.suit === card.suit && passedCard.rank === card.rank
        )
    );

    // Find who is passing to this player
    // If we pass left (to index + 1), then we receive from right (index - 1 = index + 3)
    // If we pass right (to index + 3), then we receive from left (index + 1)
    // If we pass across (to index + 2), then we receive from across (index + 2)
    let receiverOffset: number;
    switch (direction) {
      case "left":
        receiverOffset = 3; // Receive from right (player passing left to us)
        break;
      case "right":
        receiverOffset = 1; // Receive from left (player passing right to us)
        break;
      case "across":
        receiverOffset = 2; // Receive from across
        break;
      default:
        receiverOffset = 0;
    }

    const fromPlayerIndex = (playerIndex + receiverOffset) % 4;
    const fromPlayer = gameState.players[fromPlayerIndex];
    const incomingSubmission = submissions.find(
      (s) => s.playerId === fromPlayer.id
    );

    if (incomingSubmission) {
      newHand = [...newHand, ...incomingSubmission.cards];
      // Track received cards for reveal phase
      receivedCards[playerIndex] = [...incomingSubmission.cards];
    }

    // Sort the new hand
    newHand = sortHand(newHand);

    return {
      ...player,
      hand: newHand,
    };
  });

  // Update hands array to match players
  const newHands = newPlayers.map((p) => p.hand);

  return {
    gameState: {
      ...gameState,
      players: newPlayers,
      hands: newHands,
      isPassingPhase: false,
      isRevealPhase: true, // Enter reveal phase to show received cards
      receivedCards, // Cards each player received
      passSubmissions: undefined, // Clear submissions after executing
    },
  };
}

/**
 * Processes all AI player passes in a single call.
 * This is meant to be called imperatively from mutations, not from useEffect.
 *
 * @param gameState - Current game state
 * @param cardChooser - Function that selects 3 cards to pass from a hand
 * @returns Updated game state with all AI passes submitted
 */
export function processAIPasses(
  gameState: GameState,
  cardChooser: (hand: Card[]) => Card[]
): GameState {
  if (!gameState.isPassingPhase) return gameState;
  if (gameState.passDirection === "none") return gameState;

  let currentState = gameState;

  // Process each AI player
  for (const player of gameState.players) {
    if (!player.isAI) continue;
    if (hasPlayerSubmittedPass(currentState, player.id)) continue;

    const cardsToPass = cardChooser(player.hand);
    if (cardsToPass.length !== 3) continue;

    const result = submitPassSelection(currentState, player.id, cardsToPass);
    if (!result.error) {
      currentState = result.gameState;
    }
  }

  return currentState;
}
