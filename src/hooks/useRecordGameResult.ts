import { useEffect, useRef } from "react";
import { useGameStats } from "./useGameStats";
import { useAuth } from "./useAuth";
import type { GameState } from "../types/game";

interface UseRecordGameResultProps {
  gameState: GameState | null;
  currentPlayerId: string | null;
  showGameEnd: boolean;
}

/**
 * Automatically records game results when a game ends.
 * - Only records for human players (not AI, not spectators)
 * - Only records once per game (tracks last recorded game)
 * - Records silently in background (doesn't affect UX)
 * - Anonymous users: stats saved to localStorage
 * - Authenticated users: stats saved to Convex
 */
export function useRecordGameResult({
  gameState,
  currentPlayerId,
  showGameEnd,
}: UseRecordGameResultProps) {
  const { recordGameResult } = useGameStats();
  const { refreshStats } = useAuth();

  // Track which game we've recorded to avoid duplicates
  // Using a combination of round number + scores as a simple game identifier
  const lastRecordedGameRef = useRef<string | null>(null);

  useEffect(() => {
    // Only record when game has ended and we're showing the game end screen
    if (!showGameEnd || !gameState?.isGameOver || !currentPlayerId) {
      return;
    }

    // Find the current player in the game
    const playerIndex = gameState.players.findIndex(
      (p) => p.id === currentPlayerId
    );

    // Not a player in this game (spectator)
    if (playerIndex === -1) {
      return;
    }

    const player = gameState.players[playerIndex];

    // Don't record stats for AI players
    if (player.isAI) {
      return;
    }

    // Create a simple game identifier to avoid duplicate recordings
    const gameId = `${gameState.roundNumber}-${gameState.scores.join("-")}`;

    if (lastRecordedGameRef.current === gameId) {
      return; // Already recorded this game
    }

    // Record the result
    const won = gameState.winnerIndex === playerIndex;
    const pointsTaken = gameState.scores[playerIndex];

    // Check if this player shot the moon in any round
    // Note: shotTheMoon only contains the last round's moon shot, but we could
    // track cumulative moon shots if we stored them differently
    const shotTheMoon = gameState.shotTheMoon?.playerIndex === playerIndex;

    lastRecordedGameRef.current = gameId;

    recordGameResult({
      won,
      pointsTaken,
      shotTheMoon,
    });

    // Trigger a refresh so the UI updates with new local stats
    refreshStats();
  }, [showGameEnd, gameState, currentPlayerId, recordGameResult, refreshStats]);
}
