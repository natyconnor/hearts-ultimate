import { supabase } from "../supabaseClient";
import type { GameRoom, GameState } from "../types/game";

const initialGameState: GameState = {
  players: [],
  hands: [],
  currentTrick: [],
  lastCompletedTrick: undefined,
  lastTrickWinnerIndex: undefined,
  scores: [0, 0, 0, 0],
  roundScores: [0, 0, 0, 0],
  heartsBroken: false,
  roundNumber: 1,
  currentTrickNumber: 1,
  isRoundComplete: false,
  isGameOver: false,
  winnerIndex: undefined,
};

/**
 * Creates a new game room in Supabase
 */
export async function createRoom(slug: string): Promise<GameRoom> {
  const { data, error } = await supabase
    .from("game_rooms")
    .insert({
      slug,
      status: "waiting",
      game_state: initialGameState,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create room: ${error.message}`);
  }

  return {
    id: data.id,
    slug: data.slug,
    status: data.status as "waiting" | "playing" | "finished",
    gameState: data.game_state as GameState,
    createdAt: data.created_at,
  };
}

/**
 * Fetches a room by its slug
 */
export async function getRoomBySlug(slug: string): Promise<GameRoom | null> {
  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch room: ${error.message}`);
  }

  return {
    id: data.id,
    slug: data.slug,
    status: data.status as "waiting" | "playing" | "finished",
    gameState: data.game_state as GameState,
    createdAt: data.created_at,
  };
}

/**
 * Updates the game state for a room
 */
export async function updateRoomGameState(
  slug: string,
  gameState: GameState
): Promise<void> {
  const { error } = await supabase
    .from("game_rooms")
    .update({ game_state: gameState })
    .eq("slug", slug);

  if (error) {
    throw new Error(`Failed to update game state: ${error.message}`);
  }
}

/**
 * Updates the room status
 */
export async function updateRoomStatus(
  slug: string,
  status: "waiting" | "playing" | "finished"
): Promise<void> {
  const { error } = await supabase
    .from("game_rooms")
    .update({ status })
    .eq("slug", slug);

  if (error) {
    throw new Error(`Failed to update room status: ${error.message}`);
  }
}
