import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { STORAGE_KEYS } from "../lib/constants";
import type { GameState } from "../types/game";

interface UsePlayerReconnectionParams {
  slug: string | null;
  gameState: GameState | null;
  roomStatus: "waiting" | "playing" | "finished" | null;
  currentPlayerId: string | null;
  setCurrentPlayerId: (id: string | null) => void;
  updateGameState: (gameState: GameState) => void;
}

/**
 * Hook that handles player reconnection after a page refresh or temporary disconnect.
 *
 * On mount, checks if localStorage has a playerId that matches a player in the room.
 * If found and the player was marked as disconnected, clears the disconnected status
 * and updates their lastSeen to allow the game to resume.
 */
export function usePlayerReconnection({
  slug,
  gameState,
  roomStatus,
  currentPlayerId,
  setCurrentPlayerId,
  updateGameState,
}: UsePlayerReconnectionParams) {
  const hasAttemptedReconnectionRef = useRef(false);
  const updateRoomGameState = useMutation(api.rooms.updateGameState);

  useEffect(() => {
    // Only attempt reconnection once per mount
    if (hasAttemptedReconnectionRef.current) return;

    // Wait for game state to load
    if (!gameState || !slug) return;

    // Only reconnect to active games
    if (roomStatus !== "playing" && roomStatus !== "waiting") return;

    // Check if we already have a current player set
    if (currentPlayerId) {
      // Verify the current player is still in the game
      const isStillInGame = gameState.players.some(
        (p) => p.id === currentPlayerId
      );
      if (isStillInGame) {
        hasAttemptedReconnectionRef.current = true;
        return;
      }
    }

    // Try to reconnect using stored player ID
    const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!storedPlayerId) {
      hasAttemptedReconnectionRef.current = true;
      return;
    }

    // Find the player in the current game state
    const playerIndex = gameState.players.findIndex(
      (p) => p.id === storedPlayerId
    );

    if (playerIndex === -1) {
      // Player not found - they may have been removed or it's a different game
      // Clear stale localStorage
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
      hasAttemptedReconnectionRef.current = true;
      return;
    }

    // Found the player - reconnect!
    hasAttemptedReconnectionRef.current = true;
    setCurrentPlayerId(storedPlayerId);

    // Clear disconnected status and update lastSeen
    const player = gameState.players[playerIndex];
    if (player.disconnectedAt || !player.lastSeen) {
      const now = Date.now();
      const updatedPlayers = gameState.players.map((p, idx) => {
        if (idx === playerIndex) {
          return {
            ...p,
            lastSeen: now,
            disconnectedAt: undefined,
          };
        }
        return p;
      });

      const updatedGameState: GameState = {
        ...gameState,
        players: updatedPlayers,
      };

      // Update both local state and server
      updateGameState(updatedGameState);
      updateRoomGameState({ slug, gameState: updatedGameState }).catch((err) => {
        console.error("Failed to update reconnection status:", err);
      });

      console.log(`Player ${player.name} reconnected successfully`);
    }
  }, [
    slug,
    gameState,
    roomStatus,
    currentPlayerId,
    setCurrentPlayerId,
    updateGameState,
    updateRoomGameState,
  ]);
}
