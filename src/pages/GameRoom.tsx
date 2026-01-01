import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoomBySlug,
  updateRoomGameState,
  updateRoomStatus,
} from "../lib/roomApi";
import { useGameRealtime } from "../hooks/useGameRealtime";
import { useRoomSync } from "../hooks/useRoomSync";
import { useRoomNavigationBlocker } from "../hooks/useRoomNavigationBlocker";
import { useGameEndHandler } from "../hooks/useGameEndHandler";
import { usePageUnloadWarning } from "../hooks/usePageUnloadWarning";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS } from "../lib/constants";
import { createAIPlayersToFillSlots } from "../lib/aiPlayers";
import { createAndDeal } from "../game/deck";
import { GameTable } from "../components/GameTable";
import type { GameState, Player, Card as CardType } from "../types/game";

export function GameRoom() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    gameState,
    currentRoom,
    setCurrentRoom,
    updateGameState,
    clearCurrentRoom,
  } = useGameStore();

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.PLAYER_ID)
  );

  const { isConnected, error: realtimeError } = useGameRealtime(slug ?? null);

  const {
    data: room,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["room", slug],
    queryFn: () => {
      if (!slug) throw new Error("No slug provided");
      return getRoomBySlug(slug);
    },
    enabled: !!slug,
  });

  useRoomSync(room, slug);

  useEffect(() => {
    return () => {
      const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      if (!storedPlayerId) {
        clearCurrentRoom();
      }
    };
  }, [clearCurrentRoom]);

  const currentGameState = gameState ?? room?.gameState ?? null;
  const players = useMemo(
    () => currentGameState?.players ?? [],
    [currentGameState]
  );
  const roomStatus = currentRoom.status ?? room?.status ?? "waiting";

  const currentPlayer = useMemo(
    () =>
      currentPlayerId ? players.find((p) => p.id === currentPlayerId) : null,
    [currentPlayerId, players]
  );
  const isPlayerInRoom = !!currentPlayer;

  useRoomNavigationBlocker({
    slug: slug ?? null,
    isPlayerInRoom,
    roomStatus,
    currentPlayerId,
    currentGameState,
  });

  usePageUnloadWarning({
    isPlayerInRoom,
    roomStatus,
    enabled: !!(slug && room && currentPlayerId),
  });

  useGameEndHandler({ room, isPlayerInRoom });

  const joinRoomMutation = useMutation({
    mutationFn: async (playerName: string) => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;

      if (room.status !== "waiting")
        throw new Error("Room is not accepting players");
      if (currentGameState.players.length >= 4) throw new Error("Room is full");

      const existingPlayer = currentGameState.players.find(
        (p) => p.id === currentPlayerId
      );
      if (existingPlayer) {
        throw new Error("You are already in this room");
      }

      const playerId = `player-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isAI: false,
        hand: [],
        score: 0,
      };

      const updatedGameState: GameState = {
        ...currentGameState,
        players: [...currentGameState.players, newPlayer],
      };

      await updateRoomGameState(slug, updatedGameState);

      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
      setCurrentPlayerId(playerId);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const addAIPlayersMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "waiting")
        throw new Error("Cannot add AI players after game started");
      if (currentGameState.players.length >= 4)
        throw new Error("Room is already full");

      const newAIPlayers = createAIPlayersToFillSlots(currentGameState.players);
      const updatedGameState: GameState = {
        ...currentGameState,
        players: [...currentGameState.players, ...newAIPlayers],
      };

      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "waiting") throw new Error("Game has already started");
      if (currentGameState.players.length !== 4)
        throw new Error("Need 4 players to start");

      // Deal cards to all 4 players
      const hands = createAndDeal();

      // Assign hands to players and update their hand arrays
      const playersWithHands = currentGameState.players.map(
        (player, index) => ({
          ...player,
          hand: hands[index],
        })
      );

      const updatedGameState: GameState = {
        ...currentGameState,
        players: playersWithHands,
        hands: hands,
      };

      // Update game state with dealt cards, then update status
      await updateRoomGameState(slug, updatedGameState);
      await updateRoomStatus(slug, "playing");

      setCurrentRoom({
        roomId: room.id,
        slug: room.slug,
        status: "playing",
      });

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room || !currentPlayerId) throw new Error("Not in room");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      const updatedPlayers = currentGameState.players.filter(
        (p) => p.id !== currentPlayerId
      );

      const updatedGameState: GameState = {
        ...currentGameState,
        players: updatedPlayers,
      };

      if (roomStatus === "playing") {
        await updateRoomStatus(slug, "finished");
      }

      await updateRoomGameState(slug, updatedGameState);

      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
      setCurrentPlayerId(null);

      return { updatedGameState, endedGame: roomStatus === "playing" };
    },
    onSuccess: (result) => {
      updateGameState(result.updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
      if (result.endedGame) {
        alert("A player left the game. The game has ended.");
      }
      navigate("/");
    },
  });

  const handleJoin = () => {
    const playerName = prompt("Enter your name:");
    if (playerName && playerName.trim()) {
      joinRoomMutation.mutate(playerName.trim());
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
      addAIPlayersMutation.mutate();
    }
  };

  const handleStartGame = () => {
    if (
      window.confirm(
        "Are you sure you want to start the game? All 4 players must be ready."
      )
    ) {
      startGameMutation.mutate();
    }
  };

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to leave this room?")) {
      leaveRoomMutation.mutate();
    }
  };

  const canJoin =
    roomStatus === "waiting" && players.length < 4 && !isPlayerInRoom;
  const canAddAI =
    roomStatus === "waiting" && players.length < 4 && players.length > 0;
  const canStart =
    players.length === 4 && roomStatus === "waiting" && isPlayerInRoom;
  const canLeave = isPlayerInRoom && roomStatus === "waiting";

  const handleCardClick = (card: CardType, index: number) => {
    // TODO: Implement card playing logic
    console.log("Card clicked:", card, index);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">
          Error: {error ? String(error) : "Room not found"}
        </div>
      </div>
    );
  }

  // Show game table when playing
  if (roomStatus === "playing") {
    return (
      <div className="relative w-full h-screen overflow-hidden">
        {/* Header overlay */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div>
            <h1 className="text-2xl font-bold text-poker-green">
              Room: {slug}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
          {canLeave && (
            <button
              onClick={handleLeave}
              disabled={leaveRoomMutation.isPending}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {leaveRoomMutation.isPending ? "Leaving..." : "Leave Game"}
            </button>
          )}
        </div>

        <GameTable
          players={players}
          currentPlayerId={currentPlayerId}
          currentTrick={currentGameState?.currentTrick || []}
          onCardClick={handleCardClick}
        />
      </div>
    );
  }

  // Lobby view when waiting
  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green via-green-800 to-poker-green flex items-center justify-center p-4">
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
          <div className="text-2xl font-mono font-bold text-poker-green bg-gray-100 p-3 rounded-lg">
            {slug}
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
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isCurrentPlayer
                      ? "border-poker-green bg-green-50"
                      : player
                      ? "border-gray-200 bg-gray-50"
                      : "border-dashed border-gray-300 bg-gray-100"
                  }`}
                >
                  {player ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {player.name}
                          {player.isAI && (
                            <span className="ml-2 text-xs text-gray-500">
                              (AI)
                            </span>
                          )}
                        </div>
                        {isCurrentPlayer && (
                          <div className="text-sm text-poker-green font-medium">
                            You
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">Empty Slot</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={joinRoomMutation.isPending}
              className="px-6 py-3 bg-poker-green text-white rounded-lg hover:bg-green-800 disabled:opacity-50 font-semibold"
            >
              {joinRoomMutation.isPending ? "Joining..." : "Join as Player"}
            </button>
          )}

          {canAddAI && (
            <button
              onClick={handleAddAIPlayers}
              disabled={addAIPlayersMutation.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {addAIPlayersMutation.isPending
                ? "Adding AI..."
                : `Add AI Player${4 - players.length > 1 ? "s" : ""}`}
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartGame}
              disabled={startGameMutation.isPending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {startGameMutation.isPending ? "Starting..." : "Start Game"}
            </button>
          )}

          {canLeave && (
            <button
              onClick={handleLeave}
              disabled={leaveRoomMutation.isPending}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
            >
              {leaveRoomMutation.isPending ? "Leaving..." : "Leave Room"}
            </button>
          )}
        </div>

        {joinRoomMutation.isError && joinRoomMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {joinRoomMutation.error instanceof Error
              ? joinRoomMutation.error.message
              : "Failed to join"}
          </div>
        )}

        {addAIPlayersMutation.isError && addAIPlayersMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {addAIPlayersMutation.error instanceof Error
              ? addAIPlayersMutation.error.message
              : "Failed to add AI players"}
          </div>
        )}

        {startGameMutation.isError && startGameMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {startGameMutation.error instanceof Error
              ? startGameMutation.error.message
              : "Failed to start game"}
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
