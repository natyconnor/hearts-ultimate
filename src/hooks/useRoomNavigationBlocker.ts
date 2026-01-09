import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import {
  updateRoomGameState,
  updateRoomStatus,
  deleteRoom,
} from "../lib/roomApi";
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

export function useRoomNavigationBlocker({
  slug,
  isPlayerInRoom,
  roomStatus,
  currentPlayerId,
  currentGameState,
}: UseRoomNavigationBlockerProps) {
  const { clearCurrentRoom } = useGameStore();
  const isPlayerInRoomRef = useRef(isPlayerInRoom);
  const roomStatusRef = useRef(roomStatus);

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

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (!currentPlayerId || !currentGameState || !slug) {
      blocker.reset();
      return;
    }

    const message =
      roomStatusRef.current === "playing"
        ? "You are leaving an active game. This will end the game for everyone. Are you sure?"
        : "You are leaving the room. Do you want to leave the game?";

    const shouldLeave = window.confirm(message);
    if (!shouldLeave) {
      blocker.reset();
      return;
    }

    const currentRoomStatus = roomStatusRef.current;
    const updatedPlayers = currentGameState.players.filter(
      (p) => p.id !== currentPlayerId
    );
    const updatedGameState: GameState = {
      ...currentGameState,
      players: updatedPlayers,
    };

    // If this was the last player, delete the room
    const isRoomEmpty = updatedPlayers.length === 0;

    const promises: Promise<void>[] = [];
    if (isRoomEmpty) {
      promises.push(deleteRoom(slug));
    } else {
      promises.push(updateRoomGameState(slug, updatedGameState));
      if (currentRoomStatus === "playing") {
        promises.push(updateRoomStatus(slug, "finished"));
      }
    }

    Promise.all(promises)
      .then(() => {
        localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
        localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
        clearCurrentRoom();
        if (currentRoomStatus === "playing") {
          alert("You left the game. The game has ended for all players.");
        }
        blocker.proceed();
      })
      .catch((err) => {
        console.error("Failed to leave room:", err);
        blocker.reset();
      });
  }, [blocker, currentPlayerId, currentGameState, slug, clearCurrentRoom]);

  return blocker;
}
