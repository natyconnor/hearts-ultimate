import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import type { GameRoom } from "../types/game";

export function useRoomSync(
  room: GameRoom | null | undefined,
  slug: string | undefined
) {
  const { setCurrentRoom, updateGameState, currentRoom } = useGameStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!room) return;

    setCurrentRoom({
      roomId: room.id,
      slug: room.slug,
      status: room.status,
    });
    updateGameState(room.gameState);
  }, [room, setCurrentRoom, updateGameState]);

  useEffect(() => {
    if (currentRoom.status && room && currentRoom.status !== room.status) {
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    }
  }, [currentRoom.status, room, queryClient, slug]);
}
