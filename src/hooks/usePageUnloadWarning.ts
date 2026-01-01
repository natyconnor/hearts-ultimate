import { useEffect } from "react";

interface UsePageUnloadWarningProps {
  isPlayerInRoom: boolean;
  roomStatus: "waiting" | "playing" | "finished";
  enabled: boolean;
}

export function usePageUnloadWarning({
  isPlayerInRoom,
  roomStatus,
  enabled,
}: UsePageUnloadWarningProps) {
  useEffect(() => {
    if (!enabled || !isPlayerInRoom) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (roomStatus === "waiting") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, isPlayerInRoom, roomStatus]);
}

