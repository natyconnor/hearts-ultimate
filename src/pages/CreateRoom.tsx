import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { generateSlug } from "../lib/slugGenerator";
import { createRoom } from "../lib/roomApi";
import { useGameStore } from "../store/gameStore";

export function CreateRoom() {
  const navigate = useNavigate();
  const { setCurrentRoom, setLoading, setError } = useGameStore();

  const createRoomMutation = useMutation({
    mutationFn: async (slug: string) => {
      setLoading(true);
      setError(null);
      return createRoom(slug);
    },
    onSuccess: (room) => {
      setCurrentRoom({
        roomId: room.id,
        slug: room.slug,
        status: room.status,
      });
      setLoading(false);
      navigate(`/room/${room.slug}`);
    },
    onError: (error: Error) => {
      setLoading(false);
      setError(error.message);
      console.error("Failed to create room:", error);
    },
  });

  const handleCreateGame = () => {
    const slug = generateSlug();
    createRoomMutation.mutate(slug);
  };

  return (
    <div>
      <h1>Create Game</h1>
      <button
        onClick={handleCreateGame}
        disabled={createRoomMutation.isPending}
      >
        {createRoomMutation.isPending ? "Creating..." : "Create Game"}
      </button>
      {createRoomMutation.isError && (
        <p style={{ color: "red" }}>
          Error:{" "}
          {createRoomMutation.error instanceof Error
            ? createRoomMutation.error.message
            : "Failed to create room"}
        </p>
      )}
    </div>
  );
}
