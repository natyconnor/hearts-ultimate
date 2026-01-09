import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, Check, Eye } from "lucide-react";
import { SoundSettings } from "./SoundSettings";
import { cn } from "../lib/utils";
import { getDifficultyDisplayName } from "../lib/aiPlayers";
import type { Player, AIDifficulty, Spectator } from "../types/game";
import type { UseMutationResult } from "@tanstack/react-query";

const DIFFICULTY_OPTIONS: {
  value: AIDifficulty;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    description: "Simple AI that plays basic cards",
    icon: "🌱",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Strategic AI that avoids penalties",
    icon: "⚡",
  },
  {
    value: "hard",
    label: "Hard",
    description: "Expert AI with card counting",
    icon: "🧠",
  },
];

interface LobbyMutations {
  joinRoom: UseMutationResult<unknown, Error, string>;
  addAIPlayers: UseMutationResult<unknown, Error, void>;
  updateAIDifficulty: UseMutationResult<
    unknown,
    Error,
    { playerId: string; difficulty: AIDifficulty }
  >;
  startGame: UseMutationResult<unknown, Error, void>;
  leaveRoom: UseMutationResult<unknown, Error, void>;
}

interface SpectatorMutations {
  joinSpectator: UseMutationResult<unknown, Error, string>;
  leaveSpectator: UseMutationResult<unknown, Error, void>;
}

interface GameLobbyProps {
  slug: string;
  players: Player[];
  spectators: Spectator[];
  currentPlayerId: string | null;
  currentSpectatorId: string | null;
  isConnected: boolean;
  roomStatus: "waiting" | "playing" | "finished";
  lobbyMutations: LobbyMutations;
  spectatorMutations: SpectatorMutations;
  realtimeError: string | null;
}

export function GameLobby({
  slug,
  players,
  spectators,
  currentPlayerId,
  currentSpectatorId,
  isConnected,
  roomStatus,
  lobbyMutations,
  spectatorMutations,
  realtimeError,
}: GameLobbyProps) {
  const [openDifficultyMenu, setOpenDifficultyMenu] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const currentPlayer = currentPlayerId
    ? players.find((p) => p.id === currentPlayerId) ?? null
    : null;
  const isPlayerInRoom = !!currentPlayer;
  const isSpectator = !!currentSpectatorId;
  const currentSpectator = currentSpectatorId
    ? spectators.find((s) => s.id === currentSpectatorId) ?? null
    : null;

  const canJoin =
    roomStatus === "waiting" &&
    players.length < 4 &&
    !isPlayerInRoom &&
    !isSpectator;
  const canWatch = !isPlayerInRoom && !isSpectator;
  const canAddAI =
    roomStatus === "waiting" && players.length < 4 && players.length > 0;
  const canStart =
    players.length === 4 && roomStatus === "waiting" && isPlayerInRoom;
  const canLeave = isPlayerInRoom && roomStatus === "waiting";
  const canLeaveSpectator = isSpectator;

  // Close difficulty menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-difficulty-menu]")) {
        setOpenDifficultyMenu(null);
      }
    };

    if (openDifficultyMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openDifficultyMenu]);

  const handleJoin = () => {
    const playerName = prompt("Enter your name:");
    if (playerName && playerName.trim()) {
      lobbyMutations.joinRoom.mutate(playerName.trim());
    }
  };

  const handleWatchAsSpectator = () => {
    const spectatorName = prompt("Enter your name to watch:");
    if (spectatorName && spectatorName.trim()) {
      spectatorMutations.joinSpectator.mutate(spectatorName.trim());
    }
  };

  const handleLeaveSpectator = () => {
    if (window.confirm("Are you sure you want to stop watching?")) {
      spectatorMutations.leaveSpectator.mutate();
    }
  };

  const handleAddAIPlayers = () => {
    const slotsToFill = 4 - players.length;
    if (
      window.confirm(
        `Add ${slotsToFill} AI player${
          slotsToFill > 1 ? "s" : ""
        } to fill empty slots?`
      )
    ) {
      lobbyMutations.addAIPlayers.mutate();
    }
  };

  const handleStartGame = () => {
    if (
      window.confirm(
        "Are you sure you want to start the game? All 4 players must be ready."
      )
    ) {
      lobbyMutations.startGame.mutate();
    }
  };

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to leave this room?")) {
      lobbyMutations.leaveRoom.mutate();
    }
  };

  const handleCopySlug = async () => {
    try {
      await navigator.clipboard.writeText(slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = slug;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Failed to copy:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green via-green-800 to-poker-green flex items-center justify-center p-4 relative">
      {/* Sound Settings - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <SoundSettings />
      </div>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-poker-green">Game Room</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-2">Room Code</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-2xl font-mono font-bold text-poker-green bg-gray-100 p-3 rounded-lg">
              {slug}
            </div>
            <button
              onClick={handleCopySlug}
              className={cn(
                "px-4 py-3 rounded-lg",
                "bg-poker-green hover:bg-green-800",
                "text-white transition-colors",
                "flex items-center gap-2",
                "font-medium",
                copied && "bg-green-600"
              )}
              title="Copy room code"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="text-sm">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span className="text-sm">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Players ({players.length}/4)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((index) => {
              const player = players[index];
              const isCurrentPlayer = player?.id === currentPlayerId;
              const isAI = player?.isAI ?? false;
              const currentDifficulty = player?.difficulty ?? "medium";
              const isMenuOpen = openDifficultyMenu === player?.id;
              return (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-lg border-2",
                    isCurrentPlayer && "border-poker-green bg-green-50",
                    !isCurrentPlayer && player && "border-gray-200 bg-gray-50",
                    !player && "border-dashed border-gray-300 bg-gray-100"
                  )}
                >
                  {player ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">
                            {player.name}
                            {isAI && (
                              <span className="ml-2 text-xs text-gray-500">
                                (AI)
                              </span>
                            )}
                            {isCurrentPlayer && (
                              <span className="ml-2 text-xs text-gray-500">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAI && roomStatus === "waiting" && (
                        <div className="relative" data-difficulty-menu>
                          <button
                            onClick={() =>
                              setOpenDifficultyMenu(
                                isMenuOpen ? null : player.id
                              )
                            }
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2",
                              "bg-white/80 hover:bg-white rounded-lg",
                              "border border-gray-300 hover:border-poker-green",
                              "transition-all duration-200 text-sm"
                            )}
                          >
                            <span className="text-base">
                              {
                                DIFFICULTY_OPTIONS.find(
                                  (d) => d.value === currentDifficulty
                                )?.icon
                              }
                            </span>
                            <span className="flex-1 text-left font-medium text-gray-700">
                              {getDifficultyDisplayName(currentDifficulty)}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-gray-500 transition-transform",
                                isMenuOpen && "rotate-180"
                              )}
                            />
                          </button>

                          {/* Dropdown menu */}
                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                  "absolute top-full left-0 right-0 mt-1 z-50",
                                  "bg-white rounded-lg shadow-lg",
                                  "border border-gray-200 overflow-hidden"
                                )}
                              >
                                {DIFFICULTY_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => {
                                      lobbyMutations.updateAIDifficulty.mutate({
                                        playerId: player.id,
                                        difficulty: option.value,
                                      });
                                      setOpenDifficultyMenu(null);
                                    }}
                                    disabled={
                                      lobbyMutations.updateAIDifficulty
                                        .isPending
                                    }
                                    className={cn(
                                      "w-full flex items-start gap-3 px-3 py-2.5 text-left",
                                      "hover:bg-green-50 transition-colors",
                                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                      currentDifficulty === option.value &&
                                        "bg-green-50"
                                    )}
                                  >
                                    <span className="text-lg mt-0.5">
                                      {option.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className={cn(
                                          "font-medium text-sm",
                                          currentDifficulty === option.value
                                            ? "text-poker-green"
                                            : "text-gray-700"
                                        )}
                                      >
                                        {option.label}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {option.description}
                                      </div>
                                    </div>
                                    {currentDifficulty === option.value && (
                                      <span className="text-poker-green mt-1 text-sm">
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">Empty Slot</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Spectators Section */}
        {spectators.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-600">
              <Eye className="w-5 h-5" />
              Spectators ({spectators.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {spectators.map((spectator) => (
                <div
                  key={spectator.id}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm",
                    spectator.id === currentSpectatorId
                      ? "bg-purple-100 text-purple-700 border border-purple-300"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {spectator.name}
                  {spectator.id === currentSpectatorId && " (You)"}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current spectator status */}
        {currentSpectator && (
          <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 text-purple-700">
              <Eye className="w-4 h-4" />
              <span>
                You are watching as <strong>{currentSpectator.name}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={lobbyMutations.joinRoom.isPending}
              className="px-6 py-3 bg-poker-green text-white rounded-lg hover:bg-green-800 disabled:opacity-50 font-semibold"
            >
              {lobbyMutations.joinRoom.isPending
                ? "Joining..."
                : "Join as Player"}
            </button>
          )}

          {canWatch && (
            <button
              onClick={handleWatchAsSpectator}
              disabled={spectatorMutations.joinSpectator.isPending}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold flex items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {spectatorMutations.joinSpectator.isPending
                ? "Joining..."
                : "Watch as Spectator"}
            </button>
          )}

          {canAddAI && (
            <button
              onClick={handleAddAIPlayers}
              disabled={lobbyMutations.addAIPlayers.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {lobbyMutations.addAIPlayers.isPending
                ? "Adding AI..."
                : `Add AI Player${4 - players.length > 1 ? "s" : ""}`}
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartGame}
              disabled={lobbyMutations.startGame.isPending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {lobbyMutations.startGame.isPending
                ? "Starting..."
                : "Start Game"}
            </button>
          )}

          {canLeave && (
            <button
              onClick={handleLeave}
              disabled={lobbyMutations.leaveRoom.isPending}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
            >
              {lobbyMutations.leaveRoom.isPending ? "Leaving..." : "Leave Room"}
            </button>
          )}

          {canLeaveSpectator && (
            <button
              onClick={handleLeaveSpectator}
              disabled={spectatorMutations.leaveSpectator.isPending}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
            >
              {spectatorMutations.leaveSpectator.isPending
                ? "Leaving..."
                : "Stop Watching"}
            </button>
          )}
        </div>

        {lobbyMutations.joinRoom.isError && lobbyMutations.joinRoom.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {lobbyMutations.joinRoom.error instanceof Error
              ? lobbyMutations.joinRoom.error.message
              : "Failed to join"}
          </div>
        )}

        {lobbyMutations.addAIPlayers.isError &&
          lobbyMutations.addAIPlayers.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {lobbyMutations.addAIPlayers.error instanceof Error
                ? lobbyMutations.addAIPlayers.error.message
                : "Failed to add AI players"}
            </div>
          )}

        {lobbyMutations.startGame.isError && lobbyMutations.startGame.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {lobbyMutations.startGame.error instanceof Error
              ? lobbyMutations.startGame.error.message
              : "Failed to start game"}
          </div>
        )}

        {spectatorMutations.joinSpectator.isError &&
          spectatorMutations.joinSpectator.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {spectatorMutations.joinSpectator.error instanceof Error
                ? spectatorMutations.joinSpectator.error.message
                : "Failed to join as spectator"}
            </div>
          )}

        {realtimeError && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            Realtime Error: {realtimeError}
          </div>
        )}
      </div>
    </div>
  );
}
