import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UsePlayerPresenceParams {
  slug: string | null;
  playerId: string | null;
  playerName: string | null;
  enabled: boolean;
}

interface UsePlayerPresenceReturn {
  /** List of player IDs that are currently online */
  onlinePlayerIds: string[];
  /** Whether this player's presence is being tracked */
  isTracking: boolean;
}

/**
 * Hook that uses Convex to track which players are online.
 * This automatically detects when players close their browser, lose connection, etc.
 */
export function usePlayerPresence({
  slug,
  playerId,
  playerName,
  enabled,
}: UsePlayerPresenceParams): UsePlayerPresenceReturn {
  const shouldRun = enabled && !!slug && !!playerId && !!playerName;

  const trackPresence = useMutation(api.presence.track);
  const untrackPresence = useMutation(api.presence.untrack);

  // Query online players for this room
  const onlinePlayers = useQuery(
    api.presence.getOnlinePlayers,
    shouldRun && slug ? { roomSlug: slug } : "skip"
  );

  // Track presence on mount and send heartbeats
  useEffect(() => {
    if (!shouldRun || !slug || !playerId || !playerName) {
      return;
    }

    // Initial track
    trackPresence({ roomSlug: slug, playerId, playerName });

    // Heartbeat every 10 seconds
    const heartbeatInterval = setInterval(() => {
      trackPresence({ roomSlug: slug, playerId, playerName });
    }, 10_000);

    return () => {
      clearInterval(heartbeatInterval);
      // Untrack on cleanup
      untrackPresence({ playerId });
    };
  }, [shouldRun, slug, playerId, playerName, trackPresence, untrackPresence]);

  const onlinePlayerIds = useMemo(
    () => onlinePlayers?.map((p) => p.playerId) ?? [],
    [onlinePlayers]
  );

  return {
    onlinePlayerIds,
    // isTracking is derived from shouldRun - if the effect conditions are met, we're tracking
    isTracking: shouldRun,
  };
}
