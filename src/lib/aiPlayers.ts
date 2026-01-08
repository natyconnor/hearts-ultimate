import type { Player, AIDifficulty } from "../types/game";

/**
 * Predefined AI player names
 */
const AI_NAMES = ["Alice", "Bob", "Charlie", "Diana"] as const;

/**
 * Generates a unique AI player ID
 */
function generateAIPlayerId(): string {
  return `ai-player-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

/**
 * Creates an AI player with the given name and difficulty
 */
export function createAIPlayer(
  name: string,
  difficulty: AIDifficulty = "easy"
): Player {
  return {
    id: generateAIPlayerId(),
    name,
    isAI: true,
    difficulty,
    hand: [],
    score: 0,
  };
}

/**
 * Gets the next available AI name based on existing players
 * Returns names like "Alice", "Bob", "Charlie", "Diana"
 */
export function getNextAIName(existingPlayers: Player[]): string {
  const existingNames = new Set(
    existingPlayers.filter((p) => p.isAI).map((p) => p.name)
  );

  for (const name of AI_NAMES) {
    if (!existingNames.has(name)) {
      return name;
    }
  }

  // Fallback if all names are taken
  let index = 1;
  while (existingNames.has(`AI Player ${index}`)) {
    index++;
  }
  return `AI Player ${index}`;
}

/**
 * Creates AI players to fill empty slots up to 4 total players
 * Returns array of new AI players to add
 */
export function createAIPlayersToFillSlots(
  existingPlayers: Player[],
  difficulty: AIDifficulty = "easy"
): Player[] {
  const slotsToFill = 4 - existingPlayers.length;
  if (slotsToFill <= 0) {
    return [];
  }

  const newAIPlayers: Player[] = [];
  for (let i = 0; i < slotsToFill; i++) {
    const name = getNextAIName([...existingPlayers, ...newAIPlayers]);
    newAIPlayers.push(createAIPlayer(name, difficulty));
  }

  return newAIPlayers;
}

/**
 * Get display name for a difficulty level
 */
export function getDifficultyDisplayName(difficulty: AIDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Easy";
    case "medium":
      return "Medium";
    case "hard":
      return "Hard";
    default:
      return "Easy";
  }
}

/**
 * Get description for a difficulty level
 */
export function getDifficultyDescription(difficulty: AIDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Simple AI that plays basic cards";
    case "medium":
      return "Strategic AI that avoids penalties";
    case "hard":
      return "Expert AI with card counting and bluffing";
    default:
      return "";
  }
}
