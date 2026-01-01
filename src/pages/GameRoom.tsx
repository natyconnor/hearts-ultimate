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
import type { GameState, Player } from "../types/game";

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

  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "waiting") throw new Error("Game has already started");
      if (currentGameState.players.length !== 4)
        throw new Error("Need 4 players to start");

      await updateRoomStatus(slug, "playing");

      setCurrentRoom({
        roomId: room.id,
        slug: room.slug,
        status: "playing",
      });

      return room.gameState;
    },
    onSuccess: () => {
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
  const canStart =
    players.length === 4 && roomStatus === "waiting" && isPlayerInRoom;
  const canLeave = isPlayerInRoom && roomStatus === "waiting";

  if (isLoading) {
    return <div>Loading room...</div>;
  }

  if (error || !room) {
    return <div>Error: {error ? String(error) : "Room not found"}</div>;
  }

  return (
    <div>
      <h1>Game Room: {slug}</h1>
      <p>Status: {roomStatus}</p>
      <p>Realtime: {isConnected ? "Connected" : "Disconnected"}</p>
      {realtimeError && (
        <p style={{ color: "red" }}>Realtime Error: {realtimeError}</p>
      )}

      <h2>Players ({players.length}/4)</h2>
      <div>
        {[0, 1, 2, 3].map((index) => {
          const player = players[index];
          const isCurrentPlayer = player?.id === currentPlayerId;
          return (
            <div
              key={index}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                margin: "0.5rem 0",
                backgroundColor: isCurrentPlayer ? "#e3f2fd" : "transparent",
              }}
            >
              {player ? (
                <>
                  <strong>{player.name}</strong> {player.isAI && "(AI)"}
                  {isCurrentPlayer && " (You)"}
                </>
              ) : (
                <em>Empty</em>
              )}
            </div>
          );
        })}
      </div>

      {canJoin && (
        <button onClick={handleJoin} disabled={joinRoomMutation.isPending}>
          {joinRoomMutation.isPending ? "Joining..." : "Join as Player"}
        </button>
      )}

      {canStart && (
        <button
          onClick={handleStartGame}
          disabled={startGameMutation.isPending}
        >
          {startGameMutation.isPending ? "Starting..." : "Start Game"}
        </button>
      )}

      {canLeave && (
        <button
          onClick={handleLeave}
          disabled={leaveRoomMutation.isPending}
          style={{ marginLeft: "1rem" }}
        >
          {leaveRoomMutation.isPending ? "Leaving..." : "Leave Room"}
        </button>
      )}

      {joinRoomMutation.isError && (
        <p style={{ color: "red" }}>
          {joinRoomMutation.error instanceof Error
            ? joinRoomMutation.error.message
            : "Failed to join"}
        </p>
      )}

      {startGameMutation.isError && (
        <p style={{ color: "red" }}>
          {startGameMutation.error instanceof Error
            ? startGameMutation.error.message
            : "Failed to start game"}
        </p>
      )}

      {leaveRoomMutation.isError && (
        <p style={{ color: "red" }}>
          {leaveRoomMutation.error instanceof Error
            ? leaveRoomMutation.error.message
            : "Failed to leave room"}
        </p>
      )}
    </div>
  );
}
