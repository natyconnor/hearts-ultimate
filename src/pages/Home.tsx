import { useEffect } from "react";
import { CreateRoom } from "./CreateRoom";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS } from "../lib/constants";

export function Home() {
  const clearCurrentRoom = useGameStore((state) => state.clearCurrentRoom);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!storedPlayerId) {
      clearCurrentRoom();
    }
  }, [clearCurrentRoom]);

  return (
    <div>
      <h1>Hearts Card Game</h1>
      <CreateRoom />
    </div>
  );
}
