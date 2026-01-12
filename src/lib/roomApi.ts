import { supabase } from "../supabaseClient";
import type { GameRoom, GameState, Spectator } from "../types/game";

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
      spectators: [],
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
    updatedAt: data.updated_at,
    spectators: (data.spectators as Spectator[]) ?? [],
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
    updatedAt: data.updated_at,
    spectators: (data.spectators as Spectator[]) ?? [],
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

/**
 * Deletes a room by its slug
 */
export async function deleteRoom(slug: string): Promise<void> {
  const { error } = await supabase.from("game_rooms").delete().eq("slug", slug);

  if (error) {
    throw new Error(`Failed to delete room: ${error.message}`);
  }
}

/**
 * Adds a spectator to a room
 */
export async function joinAsSpectator(
  slug: string,
  spectator: Spectator
): Promise<Spectator[]> {
  // First get current spectators
  const { data: roomData, error: fetchError } = await supabase
    .from("game_rooms")
    .select("spectators")
    .eq("slug", slug)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch room: ${fetchError.message}`);
  }

  const currentSpectators = (roomData.spectators as Spectator[]) ?? [];

  // Check if already a spectator
  if (currentSpectators.some((s) => s.id === spectator.id)) {
    return currentSpectators;
  }

  const updatedSpectators = [...currentSpectators, spectator];

  const { error: updateError } = await supabase
    .from("game_rooms")
    .update({ spectators: updatedSpectators })
    .eq("slug", slug);

  if (updateError) {
    throw new Error(`Failed to add spectator: ${updateError.message}`);
  }

  return updatedSpectators;
}

/**
 * Removes a spectator from a room
 */
export async function leaveAsSpectator(
  slug: string,
  spectatorId: string
): Promise<Spectator[]> {
  // First get current spectators
  const { data: roomData, error: fetchError } = await supabase
    .from("game_rooms")
    .select("spectators")
    .eq("slug", slug)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch room: ${fetchError.message}`);
  }

  const currentSpectators = (roomData.spectators as Spectator[]) ?? [];
  const updatedSpectators = currentSpectators.filter(
    (s) => s.id !== spectatorId
  );

  const { error: updateError } = await supabase
    .from("game_rooms")
    .update({ spectators: updatedSpectators })
    .eq("slug", slug);

  if (updateError) {
    throw new Error(`Failed to remove spectator: ${updateError.message}`);
  }

  return updatedSpectators;
}

/**
 * Updates the spectators list for a room
 */
export async function updateRoomSpectators(
  slug: string,
  spectators: Spectator[]
): Promise<void> {
  const { error } = await supabase
    .from("game_rooms")
    .update({ spectators })
    .eq("slug", slug);

  if (error) {
    throw new Error(`Failed to update spectators: ${error.message}`);
  }
}
