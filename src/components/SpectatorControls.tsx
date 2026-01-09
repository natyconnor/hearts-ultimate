import { useEffect, useCallback } from "react";
import { Eye, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { cn } from "../lib/utils";
import type { Player, Spectator } from "../types/game";

interface SpectatorControlsProps {
  players: Player[];
  spectators: Spectator[];
  watchingPlayerIndex: number;
  onChangeWatchingPlayer: (index: number) => void;
  currentSpectatorName?: string;
}

export function SpectatorControls({
  players,
  spectators,
  watchingPlayerIndex,
  onChangeWatchingPlayer,
  currentSpectatorName,
}: SpectatorControlsProps) {
  const watchedPlayer = players[watchingPlayerIndex];

  // Left = clockwise (to the player on the left of current view)
  const goToLeftPlayer = useCallback(() => {
    const newIndex = (watchingPlayerIndex + 1) % players.length;
    onChangeWatchingPlayer(newIndex);
  }, [watchingPlayerIndex, players.length, onChangeWatchingPlayer]);

  // Right = counter-clockwise (to the player on the right of current view)
  const goToRightPlayer = useCallback(() => {
    const newIndex = (watchingPlayerIndex - 1 + players.length) % players.length;
    onChangeWatchingPlayer(newIndex);
  }, [watchingPlayerIndex, players.length, onChangeWatchingPlayer]);

  // Keyboard navigation with arrow keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToLeftPlayer();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToRightPlayer();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToLeftPlayer, goToRightPlayer]);

  return (
    <div className="flex items-center gap-4">
      {/* Spectator Mode Indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/90 rounded-lg text-white text-sm">
        <Eye className="w-4 h-4" />
        <span className="font-medium">Spectating</span>
        {currentSpectatorName && (
          <span className="text-purple-200">as {currentSpectatorName}</span>
        )}
      </div>

      {/* Player Selector with Arrow Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={goToLeftPlayer}
          className={cn(
            "p-1.5 rounded-lg",
            "bg-white/90 hover:bg-white",
            "border border-gray-300 hover:border-purple-500",
            "transition-all duration-200",
            "shadow-md hover:shadow-lg"
          )}
          title="Watch player on left (←)"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 min-w-[160px] justify-center",
            "bg-white/90 rounded-lg",
            "border border-gray-300",
            "text-sm shadow-md"
          )}
        >
          <span className="text-gray-500">Watching:</span>
          <span className="font-semibold text-gray-900">
            {watchedPlayer?.name ?? "Unknown"}
            {watchedPlayer?.isAI && " 🤖"}
          </span>
        </div>

        <button
          onClick={goToRightPlayer}
          className={cn(
            "p-1.5 rounded-lg",
            "bg-white/90 hover:bg-white",
            "border border-gray-300 hover:border-purple-500",
            "transition-all duration-200",
            "shadow-md hover:shadow-lg"
          )}
          title="Watch player on right (→)"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Spectator Count */}
      {spectators.length > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 rounded-lg text-white/80 text-sm">
          <Users className="w-4 h-4" />
          <span>{spectators.length}</span>
        </div>
      )}
    </div>
  );
}
