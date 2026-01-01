import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS } from "../lib/constants";
import type { GameRoom } from "../types/game";

interface UseGameEndHandlerProps {
  room: GameRoom | null | undefined;
  isPlayerInRoom: boolean;
}

export function useGameEndHandler({ room, isPlayerInRoom }: UseGameEndHandlerProps) {
  const navigate = useNavigate();
  const { currentRoom, clearCurrentRoom } = useGameStore();

  useEffect(() => {
    if (!room) return;

    const status = currentRoom.status ?? room.status;
    if (status === "finished" && isPlayerInRoom) {
      alert("A player left the game. The game has ended.");
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
      clearCurrentRoom();
      navigate("/");
    }
  }, [currentRoom.status, room?.status, isPlayerInRoom, navigate, clearCurrentRoom, room]);
}

