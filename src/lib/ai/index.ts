/**
 * AI Module Entry Point
 *
 * Exports the main AI functions and dispatches to the correct strategy
 * based on player difficulty setting.
 */

import type { Card, GameState, AIDifficulty } from "../../types/game";
import type { AIStrategy, PlayContext, PassContext } from "./types";
import { EasyStrategy } from "./strategies/easy";
import { MediumStrategy } from "./strategies/medium";
import { HardStrategy } from "./strategies/hard";
import {
  getValidCards,
  getLeadSuit,
  isFirstTrick,
} from "../../game/rules";

// Strategy instances (reused across calls)
const strategies: Record<AIDifficulty, AIStrategy> = {
  easy: new EasyStrategy(),
  medium: new MediumStrategy(),
  hard: new HardStrategy(),
};

// Track Hard AI instances per player for memory persistence
const hardAIInstances = new Map<string, HardStrategy>();

/**
 * Get the appropriate strategy for a player
 */
function getStrategy(
  playerId: string,
  difficulty: AIDifficulty
): AIStrategy {
  if (difficulty === "hard") {
    // Hard AI needs per-player instances for memory
    if (!hardAIInstances.has(playerId)) {
      hardAIInstances.set(playerId, new HardStrategy());
    }
    return hardAIInstances.get(playerId)!;
  }
  return strategies[difficulty];
}

/**
 * Get the difficulty for an AI player, defaulting to "easy"
 */
function getPlayerDifficulty(gameState: GameState, playerIndex: number): AIDifficulty {
  const player = gameState.players[playerIndex];
  return player?.difficulty ?? "easy";
}

/**
 * Choose cards to pass during the passing phase
 */
export function chooseAICardsToPass(
  hand: Card[],
  gameState: GameState,
  playerIndex: number
): Card[] {
  const player = gameState.players[playerIndex];
  const difficulty = getPlayerDifficulty(gameState, playerIndex);
  const strategy = getStrategy(player.id, difficulty);

  const context: PassContext = {
    hand,
    passDirection: gameState.passDirection as "left" | "right" | "across",
    gameState,
    playerIndex,
  };

  return strategy.chooseCardsToPass(context);
}

/**
 * Choose a card to play during the playing phase
 */
export function chooseAICard(
  gameState: GameState,
  playerIndex: number
): Card {
  const player = gameState.players[playerIndex];
  const difficulty = getPlayerDifficulty(gameState, playerIndex);
  const strategy = getStrategy(player.id, difficulty);

  const hand = player.hand;
  const currentTrick = gameState.currentTrick;
  const firstTrick = isFirstTrick(gameState);

  const validCards = getValidCards(
    hand,
    currentTrick,
    gameState.heartsBroken,
    firstTrick
  );

  const leadSuit = getLeadSuit(currentTrick);
  const isLeading = currentTrick.length === 0;

  // Calculate tricks played this round (13 cards per player, 4 players)
  const cardsPlayed = 13 - hand.length;
  const tricksPlayedThisRound = Math.floor(cardsPlayed);

  const context: PlayContext = {
    gameState,
    playerIndex,
    validCards,
    isLeading,
    leadSuit,
    currentTrickCards: currentTrick,
    tricksPlayedThisRound,
    isFirstTrick: firstTrick,
  };

  return strategy.chooseCardToPlay(context);
}

/**
 * Notify AI that a trick has completed (for memory updates)
 */
export function notifyTrickComplete(
  gameState: GameState,
  trick: Array<{ playerId: string; card: Card }>,
  winnerIndex: number,
  trickNumber: number
): void {
  // Notify all Hard AI instances about the completed trick
  for (const [playerId, strategy] of hardAIInstances) {
    // Only notify if this player is still in the game
    const playerInGame = gameState.players.some((p) => p.id === playerId);
    if (playerInGame && strategy.onTrickComplete) {
      strategy.onTrickComplete(trick, winnerIndex, trickNumber);
    }
  }
}

/**
 * Reset AI state for a new round
 */
export function resetAIForNewRound(gameState: GameState): void {
  // Reset Hard AI instances for players in this game
  for (const [playerId, strategy] of hardAIInstances) {
    const playerInGame = gameState.players.some((p) => p.id === playerId);
    if (playerInGame && strategy.onRoundStart) {
      strategy.onRoundStart();
    }
  }
}

/**
 * Clear all AI instances (called when game ends)
 */
export function clearAIInstances(): void {
  hardAIInstances.clear();
}

// Re-export types
export type { AIDifficulty, AIStrategy, PlayContext, PassContext } from "./types";

