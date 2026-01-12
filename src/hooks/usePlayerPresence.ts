import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  odx19ypresence_ref: string;
  odx19yplayerId: string;
  odx19yplayerName: string;
  odx19yonline_at: string;
}

interface PlayerPresenceInfo {
  playerId: string;
  playerName: string;
  isOnline: boolean;
}

interface UsePlayerPresenceParams {
  slug: string | null;
  playerId: string | null;
  playerName: string | null;
  enabled: boolean;
}

interface UsePlayerPresenceReturn {
  /** Map of playerId -> presence info for all players in the room */
  playerPresence: Map<string, PlayerPresenceInfo>;
  /** List of player IDs that are currently online */
  onlinePlayerIds: string[];
  /** Whether this player's presence is being tracked */
  isTracking: boolean;
}

// Empty map constant to avoid creating new objects
const EMPTY_MAP = new Map<string, PlayerPresenceInfo>();

/**
 * Hook that uses Supabase Realtime Presence to track which players are online.
 * This automatically detects when players close their browser, lose connection, etc.
 */
export function usePlayerPresence({
  slug,
  playerId,
  playerName,
  enabled,
}: UsePlayerPresenceParams): UsePlayerPresenceReturn {
  // Internal presence state - only updated via callbacks from Supabase
  const [internalPresence, setInternalPresence] = useState<
    Map<string, PlayerPresenceInfo>
  >(new Map());
  const [isTrackingInternal, setIsTrackingInternal] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const shouldRun = enabled && !!slug && !!playerId && !!playerName;

  const updatePresenceFromState = useCallback(
    (presenceState: Record<string, PresenceState[]>) => {
      const newPresence = new Map<string, PlayerPresenceInfo>();

      // Each key in presenceState is a unique presence identifier
      // The value is an array of presence objects (usually just one)
      Object.values(presenceState).forEach((presences) => {
        presences.forEach((presence) => {
          // Extract the actual playerId from the presence state
          // Supabase adds prefixes to avoid conflicts with internal keys
          const pId = presence.odx19yplayerId;
          const pName = presence.odx19yplayerName;

          if (pId) {
            newPresence.set(pId, {
              playerId: pId,
              playerName: pName || "Unknown",
              isOnline: true,
            });
          }
        });
      });

      setInternalPresence(newPresence);
    },
    []
  );

  // Main effect for setting up presence channel
  useEffect(() => {
    if (!shouldRun || !slug || !playerId || !playerName) {
      // Cleanup when disabled
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Create a presence channel for this room
    const channel = supabase.channel(`presence:${slug}`, {
      config: {
        presence: {
          key: playerId, // Use playerId as the presence key
        },
      },
    });

    // Heartbeat interval to keep presence fresh (10 seconds)
    // This helps Supabase detect disconnections faster
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    channel
      .on("presence", { event: "sync" }, () => {
        // Called when presence state is synchronized
        const state = channel.presenceState<PresenceState>();
        updatePresenceFromState(state);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        // Called when a new presence joins
        console.log("Player joined:", newPresences);
        const state = channel.presenceState<PresenceState>();
        updatePresenceFromState(state);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        // Called when a presence leaves (browser closed, connection lost, etc.)
        console.log("Player left:", leftPresences);
        const state = channel.presenceState<PresenceState>();
        updatePresenceFromState(state);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this player's presence
          // Using prefixed keys to avoid conflicts with Supabase internal keys
          const trackStatus = await channel.track({
            odx19yplayerId: playerId,
            odx19yplayerName: playerName,
            odx19yonline_at: new Date().toISOString(),
          });

          if (trackStatus === "ok") {
            setIsTrackingInternal(true);

            // Start heartbeat to keep presence fresh
            // This helps detect disconnections faster by re-tracking periodically
            heartbeatInterval = setInterval(async () => {
              await channel.track({
                odx19yplayerId: playerId,
                odx19yplayerName: playerName,
                odx19yonline_at: new Date().toISOString(),
              });
            }, 10_000); // Every 10 seconds
          } else {
            console.error("Failed to track presence:", trackStatus);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      // Clear heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (channelRef.current) {
        // Untrack and remove channel
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsTrackingInternal(false);
      setInternalPresence(new Map());
    };
  }, [shouldRun, slug, playerId, playerName, updatePresenceFromState]);

  // Derive final values - return empty when not running
  const playerPresence = shouldRun ? internalPresence : EMPTY_MAP;
  const isTracking = shouldRun && isTrackingInternal;
  const onlinePlayerIds = useMemo(
    () => Array.from(playerPresence.keys()),
    [playerPresence]
  );

  return {
    playerPresence,
    onlinePlayerIds,
    isTracking,
  };
}
