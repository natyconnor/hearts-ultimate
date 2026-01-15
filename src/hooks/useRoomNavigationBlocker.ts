import { useEffect, useRef, useState, useCallback } from "react";
import { useBlocker } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS } from "../lib/constants";
import type { GameState } from "../types/game";

interface UseRoomNavigationBlockerProps {
  slug: string | null;
  isPlayerInRoom: boolean;
  roomStatus: "waiting" | "playing" | "finished";
  currentPlayerId: string | null;
  currentGameState: GameState | null;
}

interface UseRoomNavigationBlockerReturn {
  /** Whether navigation is currently blocked and waiting for user confirmation */
  isBlocked: boolean;
  /** Whether we're currently processing the leave action */
  isLeaving: boolean;
  /** The message to show to the user in the confirmation modal */
  blockMessage: string;
  /** Call this when user confirms they want to leave */
  handleConfirmLeave: () => Promise<void>;
  /** Call this when user cancels and wants to stay */
  handleCancelLeave: () => void;
}

export function useRoomNavigationBlocker({
  slug,
  isPlayerInRoom,
  roomStatus,
  currentPlayerId,
  currentGameState,
}: UseRoomNavigationBlockerProps): UseRoomNavigationBlockerReturn {
  const { clearCurrentRoom } = useGameStore();
  const isPlayerInRoomRef = useRef(isPlayerInRoom);
  const roomStatusRef = useRef(roomStatus);
  const [isLeaving, setIsLeaving] = useState(false);

  // Convex mutations
  const updateGameState = useMutation(api.rooms.updateGameState);
  const updateStatus = useMutation(api.rooms.updateStatus);
  const deleteRoom = useMutation(api.rooms.deleteRoom);

  useEffect(() => {
    isPlayerInRoomRef.current = isPlayerInRoom;
    roomStatusRef.current = roomStatus;
  }, [isPlayerInRoom, roomStatus]);

  const blocker = useBlocker(() => {
    return (
      isPlayerInRoomRef.current &&
      (roomStatusRef.current === "waiting" ||
        roomStatusRef.current === "playing")
    );
  });

  const isBlocked = blocker.state === "blocked";

  const blockMessage =
    roomStatusRef.current === "playing"
      ? "You are leaving an active game. This will end the game for everyone. Are you sure?"
      : "You are leaving the room. Do you want to leave?";

  const handleCancelLeave = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  const handleConfirmLeave = useCallback(async () => {
    if (blocker.state !== "blocked") return;
    if (!currentPlayerId || !currentGameState || !slug) {
      blocker.reset();
      return;
    }

    setIsLeaving(true);

    try {
      const currentRoomStatus = roomStatusRef.current;
      const leavingPlayer = currentGameState.players.find(
        (p) => p.id === currentPlayerId
      );
      const updatedPlayers = currentGameState.players.filter(
        (p) => p.id !== currentPlayerId
      );
      const updatedGameState: GameState = {
        ...currentGameState,
        players: updatedPlayers,
        // If leaving during a game, mark the reason
        ...(currentRoomStatus === "playing" && {
          endReason: "player_left" as const,
          endedByPlayerName: leavingPlayer?.name,
        }),
      };

      // If this was the last player, delete the room
      const isRoomEmpty = updatedPlayers.length === 0;

      if (isRoomEmpty) {
        await deleteRoom({ slug });
      } else {
        await updateGameState({ slug, gameState: updatedGameState });
        if (currentRoomStatus === "playing") {
          await updateStatus({ slug, status: "finished" });
        }
      }

      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
      // Also clear spectator IDs to prevent stale state when navigating away
      localStorage.removeItem(STORAGE_KEYS.SPECTATOR_ID);
      localStorage.removeItem(STORAGE_KEYS.SPECTATOR_NAME);
      clearCurrentRoom();
      blocker.proceed();
    } catch (err) {
      console.error("Failed to leave room:", err);
      blocker.reset();
    } finally {
      setIsLeaving(false);
    }
  }, [
    blocker,
    currentPlayerId,
    currentGameState,
    slug,
    clearCurrentRoom,
    updateGameState,
    updateStatus,
    deleteRoom,
  ]);

  // Auto-reset blocker if we don't have the required data
  useEffect(() => {
    if (
      blocker.state === "blocked" &&
      (!currentPlayerId || !currentGameState || !slug)
    ) {
      blocker.reset();
    }
  }, [blocker, currentPlayerId, currentGameState, slug]);

  return {
    isBlocked,
    isLeaving,
    blockMessage,
    handleConfirmLeave,
    handleCancelLeave,
  };
}
