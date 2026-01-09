import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useGameStore } from "../store/gameStore";
import type { GameState, Spectator } from "../types/game";

interface UseGameRealtimeReturn {
  isConnected: boolean;
  error: string | null;
  unsubscribe: () => void;
}

export function useGameRealtime(slug: string | null): UseGameRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const {
    updateGameState,
    updateSpectators,
    setError: setStoreError,
    setCurrentRoom,
  } = useGameStore();

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (!slug) {
      return;
    }

    // Create a channel for this specific room
    const channel = supabase
      .channel(`game-room:${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          try {
            if (payload.new) {
              if ("game_state" in payload.new) {
                const gameState = payload.new.game_state as GameState;
                updateGameState(gameState);
              }
              if ("spectators" in payload.new) {
                const spectators = (payload.new.spectators as Spectator[]) ?? [];
                updateSpectators(spectators);
              }
              if ("status" in payload.new) {
                const status = payload.new.status as
                  | "waiting"
                  | "playing"
                  | "finished";
                setCurrentRoom({
                  roomId: payload.new.id as string,
                  slug: payload.new.slug as string,
                  status,
                });
              }
              setError(null);
              setStoreError(null);
            }
          } catch (err) {
            const errorMessage =
              err instanceof Error
                ? err.message
                : "Failed to process game state update";
            setError(errorMessage);
            setStoreError(errorMessage);
            console.error("Error processing game state update:", err);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          setError(null);
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false);
          const errorMessage = "Failed to connect to game room";
          setError(errorMessage);
          setStoreError(errorMessage);
        } else if (status === "TIMED_OUT") {
          setIsConnected(false);
          const errorMessage = "Connection to game room timed out";
          setError(errorMessage);
          setStoreError(errorMessage);
        } else if (status === "CLOSED") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      unsubscribe();
    };
  }, [slug, updateGameState, updateSpectators, setStoreError, setCurrentRoom]);

  return {
    isConnected,
    error,
    unsubscribe,
  };
}
