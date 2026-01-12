import { useEffect, useRef, useState, useCallback } from "react";
import { updateRoomStatus, updateRoomGameState } from "../lib/roomApi";
import { CONNECTION_CONFIG } from "../lib/constants";
import type { GameState, Player } from "../types/game";

interface DisconnectedPlayer {
  player: Player;
  playerIndex: number;
  disconnectedAt: number;
  remainingTime: number;
}

interface UseDisconnectionDetectionParams {
  slug: string | null;
  gameState: GameState | null;
  roomStatus: "waiting" | "playing" | "finished" | null;
  currentPlayerId: string | null;
  /** Set of player IDs that are currently online (from presence) */
  onlinePlayerIds: string[];
  enabled: boolean;
  onGameEnded?: () => void;
}

interface UseDisconnectionDetectionReturn {
  disconnectedPlayers: DisconnectedPlayer[];
  isWaitingForReconnection: boolean;
}

/**
 * Hook that detects when human players have disconnected based on presence data
 * and manages the grace period countdown before ending the game.
 */
export function useDisconnectionDetection({
  slug,
  gameState,
  roomStatus,
  currentPlayerId,
  onlinePlayerIds,
  enabled,
  onGameEnded,
}: UseDisconnectionDetectionParams): UseDisconnectionDetectionReturn {
  // Track when each player was first detected as disconnected
  const disconnectedAtRef = useRef<Map<string, number>>(new Map());
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<
    DisconnectedPlayer[]
  >([]);
  const isEndingGameRef = useRef(false);
  const initialDelayPassedRef = useRef(false);

  const shouldRun = enabled && gameState && roomStatus === "playing";

  // Convert onlinePlayerIds to a Set for O(1) lookup
  const onlinePlayerIdSetRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    onlinePlayerIdSetRef.current = new Set(onlinePlayerIds);
  }, [onlinePlayerIds]);

  // Function to calculate disconnected players
  const calculateDisconnectedPlayers = useCallback(() => {
    if (!shouldRun || !gameState || !initialDelayPassedRef.current) {
      return [];
    }

    const now = Date.now();
    const result: DisconnectedPlayer[] = [];
    const onlineSet = onlinePlayerIdSetRef.current;

    gameState.players.forEach((player, playerIndex) => {
      // Skip AI players - they don't disconnect
      if (player.isAI) return;

      // Skip the current player - we know we're connected
      if (player.id === currentPlayerId) return;

      // Check if player is online via presence
      const isOnline = onlineSet.has(player.id);

      if (!isOnline) {
        // Player is offline - check when they disconnected
        let disconnectedAt = disconnectedAtRef.current.get(player.id);

        if (!disconnectedAt) {
          // First time detecting this player as offline
          disconnectedAt = now;
          disconnectedAtRef.current.set(player.id, disconnectedAt);
        }

        const timeDisconnected = now - disconnectedAt;
        const remainingTime = Math.max(
          0,
          CONNECTION_CONFIG.GRACE_PERIOD - timeDisconnected
        );

        result.push({
          player,
          playerIndex,
          disconnectedAt,
          remainingTime,
        });
      } else {
        // Player is back online - remove from disconnected tracking
        disconnectedAtRef.current.delete(player.id);
      }
    });

    return result;
  }, [shouldRun, gameState, currentPlayerId]);

  // Reset refs when not running
  useEffect(() => {
    if (!shouldRun) {
      disconnectedAtRef.current.clear();
      isEndingGameRef.current = false;
      initialDelayPassedRef.current = false;
    }
  }, [shouldRun]);

  // Initial delay before checking for disconnections
  // Gives players time to establish their presence connection
  useEffect(() => {
    if (!shouldRun) return;

    const timer = setTimeout(() => {
      initialDelayPassedRef.current = true;
    }, CONNECTION_CONFIG.INITIAL_DETECTION_DELAY);

    return () => clearTimeout(timer);
  }, [shouldRun]);

  // Tick every second to update countdown
  useEffect(() => {
    if (!shouldRun) return;

    const interval = setInterval(() => {
      const players = calculateDisconnectedPlayers();
      setDisconnectedPlayers(players);
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldRun, calculateDisconnectedPlayers]);

  // Check if any player has exceeded the grace period
  useEffect(() => {
    const expiredPlayer = disconnectedPlayers.find(
      (dp) => dp.remainingTime <= 0
    );

    if (expiredPlayer && slug && gameState && !isEndingGameRef.current) {
      isEndingGameRef.current = true;
      endGameDueToDisconnection(
        slug,
        gameState,
        expiredPlayer.player.name
      ).then(() => {
        onGameEnded?.();
      });
    }
  }, [disconnectedPlayers, slug, gameState, onGameEnded]);

  // Return empty array if not running
  const finalDisconnectedPlayers = shouldRun ? disconnectedPlayers : [];
  const isWaitingForReconnection = finalDisconnectedPlayers.length > 0;

  return {
    disconnectedPlayers: finalDisconnectedPlayers,
    isWaitingForReconnection,
  };
}

async function endGameDueToDisconnection(
  slug: string,
  gameState: GameState,
  playerName: string
): Promise<void> {
  try {
    // Update game state with end reason
    const updatedGameState: GameState = {
      ...gameState,
      endReason: "player_disconnected",
      endedByPlayerName: playerName,
    };
    await updateRoomGameState(slug, updatedGameState);
    await updateRoomStatus(slug, "finished");
    console.log(
      `Game ended: ${playerName} disconnected and grace period expired`
    );
  } catch (error) {
    console.error("Failed to end game due to disconnection:", error);
  }
}
