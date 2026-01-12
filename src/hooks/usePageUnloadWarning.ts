import { useEffect } from "react";

interface UsePageUnloadWarningProps {
  isPlayerInRoom: boolean;
  roomStatus: "waiting" | "playing" | "finished";
  enabled: boolean;
}

/**
 * Shows browser's native "Leave site?" dialog when user tries to
 * close/refresh the page while in an active game room.
 */
export function usePageUnloadWarning({
  isPlayerInRoom,
  roomStatus,
  enabled,
}: UsePageUnloadWarningProps) {
  useEffect(() => {
    if (!enabled || !isPlayerInRoom) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn during both waiting and playing states
      // Only skip the warning for finished games
      if (roomStatus === "waiting" || roomStatus === "playing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, isPlayerInRoom, roomStatus]);
}

