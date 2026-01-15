import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import type { GameRoom } from "../types/game";

/**
 * Syncs room data from Convex query to game store.
 * Convex queries are automatically reactive, so we just need to update the store.
 */
export function useRoomSync(
  room: GameRoom | null | undefined,
  _slug: string | undefined
) {
  const { setCurrentRoom, updateGameState, updateSpectators } = useGameStore();

  useEffect(() => {
    if (!room) return;

    setCurrentRoom({
      roomId: room.id,
      slug: room.slug,
      status: room.status,
    });
    updateGameState(room.gameState);
    updateSpectators(room.spectators);
  }, [room, setCurrentRoom, updateGameState, updateSpectators]);
}
