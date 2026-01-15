import { useMutation as useConvexMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { createAIPlayersToFillSlots } from "../lib/aiPlayers";
import { createAndDeal } from "../game/deck";
import {
  prepareNewRound,
  resetGameForNewGame,
  startRoundWithPassingPhase,
  markPlayerReadyForReveal,
  finalizePassingPhase,
  playCard as playCardFn,
} from "../game/gameLogic";
import {
  submitPassSelection,
  executePassPhase,
  allPlayersHavePassed,
  processAIPassesAndFinalize,
} from "../game/passingLogic";
import { checkShootingTheMoon } from "../game/rules";
import {
  chooseAICardsToPass,
  notifyTrickComplete,
  resetAIForNewRound,
} from "../lib/ai";
import { useAIDebugStore } from "../store/aiDebugStore";
import { playSound } from "../lib/sounds";
import { STORAGE_KEYS } from "../lib/constants";
import type {
  GameState,
  Player,
  Card,
  AIDifficulty,
  Spectator,
} from "../types/game";
import { useState, useCallback } from "react";

/**
 * Updates a player's lastSeen timestamp in the game state.
 * This is used to track player presence for disconnect detection.
 */
function updatePlayerLastSeen(
  gameState: GameState,
  playerId: string
): GameState {
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return gameState;

  // Don't update lastSeen for AI players
  if (gameState.players[playerIndex].isAI) return gameState;

  const now = Date.now();
  const updatedPlayers = gameState.players.map((player, idx) => {
    if (idx === playerIndex) {
      return {
        ...player,
        lastSeen: now,
        disconnectedAt: undefined, // Clear disconnected status
      };
    }
    return player;
  });

  return {
    ...gameState,
    players: updatedPlayers,
  };
}

interface RoomData {
  id: string;
  slug: string;
  status: "waiting" | "playing" | "finished";
  gameState: GameState;
}

interface CurrentRoomState {
  status: "waiting" | "playing" | "finished" | null;
}

// Helper type for mutation state
interface MutationState<T> {
  mutate: (arg?: T, options?: { onSuccess?: () => void }) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

interface UseLobbyMutationsParams {
  slug: string | undefined;
  room: RoomData | null | undefined;
  gameState: GameState | null;
  currentRoom: CurrentRoomState;
  currentPlayerId: string | null;
  updateGameState: (gameState: GameState) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setCurrentRoom: (room: {
    roomId: string;
    slug: string;
    status: "waiting" | "playing" | "finished";
  }) => void;
  setSelectedCardsToPass: (cards: Card[]) => void;
}

export function useLobbyMutations({
  slug,
  room,
  gameState,
  currentRoom,
  currentPlayerId,
  updateGameState,
  setCurrentPlayerId,
  setCurrentRoom,
  setSelectedCardsToPass,
}: UseLobbyMutationsParams) {
  const navigate = useNavigate();

  // Convex mutations
  const updateGameStateMutation = useConvexMutation(api.rooms.updateGameState);
  const updateStatusMutation = useConvexMutation(api.rooms.updateStatus);
  const deleteRoomMutation = useConvexMutation(api.rooms.deleteRoom);

  // State for each mutation
  const [joinRoomState, setJoinRoomState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [addAIState, setAddAIState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [updateDifficultyState, setUpdateDifficultyState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [startGameState, setStartGameState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [leaveRoomState, setLeaveRoomState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [returnToLobbyState, setReturnToLobbyState] = useState({ isPending: false, isError: false, error: null as Error | null });

  const joinRoom: MutationState<string> = {
    isPending: joinRoomState.isPending,
    isError: joinRoomState.isError,
    error: joinRoomState.error,
    mutate: useCallback(async (playerName?: string, options?: { onSuccess?: () => void }) => {
      if (!playerName) return;
      setJoinRoomState({ isPending: true, isError: false, error: null });
      try {
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
          lastSeen: Date.now(),
        };

        const updatedGameState: GameState = {
          ...currentGameState,
          players: [...currentGameState.players, newPlayer],
        };

        await updateGameStateMutation({ slug, gameState: updatedGameState });

        localStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
        localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
        // Clear any stale spectator IDs when joining as a player
        localStorage.removeItem(STORAGE_KEYS.SPECTATOR_ID);
        localStorage.removeItem(STORAGE_KEYS.SPECTATOR_NAME);
        setCurrentPlayerId(playerId);
        updateGameState(updatedGameState);
        setJoinRoomState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to join room");
        setJoinRoomState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentPlayerId, updateGameStateMutation, setCurrentPlayerId, updateGameState]),
  };

  const addAIPlayers: MutationState<void> = {
    isPending: addAIState.isPending,
    isError: addAIState.isError,
    error: addAIState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setAddAIState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Room not found");
        const currentGameState = gameState ?? room.gameState;
        const roomStatus = currentRoom.status ?? room.status;

        if (roomStatus !== "waiting")
          throw new Error("Cannot add AI players after game started");
        if (currentGameState.players.length >= 4)
          throw new Error("Room is already full");

        const difficulty: AIDifficulty = "medium";

        const newAIPlayers = createAIPlayersToFillSlots(
          currentGameState.players,
          difficulty
        );
        const updatedGameState: GameState = {
          ...currentGameState,
          players: [...currentGameState.players, ...newAIPlayers],
        };

        await updateGameStateMutation({ slug, gameState: updatedGameState });
        updateGameState(updatedGameState);
        setAddAIState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to add AI players");
        setAddAIState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentRoom.status, updateGameStateMutation, updateGameState]),
  };

  const updateAIDifficulty: MutationState<{ playerId: string; difficulty: AIDifficulty }> = {
    isPending: updateDifficultyState.isPending,
    isError: updateDifficultyState.isError,
    error: updateDifficultyState.error,
    mutate: useCallback(async (args?: { playerId: string; difficulty: AIDifficulty }, options?: { onSuccess?: () => void }) => {
      if (!args) return;
      setUpdateDifficultyState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Room not found");
        const currentGameState = gameState ?? room.gameState;
        const roomStatus = currentRoom.status ?? room.status;

        if (roomStatus !== "waiting")
          throw new Error("Cannot change difficulty after game started");

        const playerIndex = currentGameState.players.findIndex(
          (p) => p.id === args.playerId
        );
        if (playerIndex === -1) throw new Error("Player not found");
        if (!currentGameState.players[playerIndex].isAI)
          throw new Error("Can only change difficulty for AI players");

        const updatedPlayers = [...currentGameState.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          difficulty: args.difficulty,
        };

        const updatedGameState: GameState = {
          ...currentGameState,
          players: updatedPlayers,
        };

        await updateGameStateMutation({ slug, gameState: updatedGameState });
        updateGameState(updatedGameState);
        setUpdateDifficultyState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to update difficulty");
        setUpdateDifficultyState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentRoom.status, updateGameStateMutation, updateGameState]),
  };

  const startGame: MutationState<void> = {
    isPending: startGameState.isPending,
    isError: startGameState.isError,
    error: startGameState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setStartGameState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Room not found");
        const currentGameState = gameState ?? room.gameState;
        const roomStatus = currentRoom.status ?? room.status;

        if (roomStatus !== "waiting") throw new Error("Game has already started");
        if (currentGameState.players.length !== 4)
          throw new Error("Need 4 players to start");

        const hands = createAndDeal();

        let updatedGameState: GameState = {
          ...currentGameState,
          roundScores: [0, 0, 0, 0],
          roundNumber: 1,
          isRoundComplete: false,
          isGameOver: false,
          winnerIndex: undefined,
        };

        updatedGameState = startRoundWithPassingPhase(updatedGameState, hands);
        resetAIForNewRound(updatedGameState);

        if (updatedGameState.isPassingPhase) {
          updatedGameState = processAIPassesAndFinalize(
            updatedGameState,
            chooseAICardsToPass,
            finalizePassingPhase
          );
        }

        await updateGameStateMutation({ slug, gameState: updatedGameState });
        await updateStatusMutation({ slug, status: "playing" });

        setCurrentRoom({
          roomId: room.id,
          slug: room.slug,
          status: "playing",
        });

        setSelectedCardsToPass([]);
        updateGameState(updatedGameState);
        setStartGameState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to start game");
        setStartGameState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentRoom.status, updateGameStateMutation, updateStatusMutation, setCurrentRoom, setSelectedCardsToPass, updateGameState]),
  };

  const leaveRoom: MutationState<void> = {
    isPending: leaveRoomState.isPending,
    isError: leaveRoomState.isError,
    error: leaveRoomState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setLeaveRoomState({ isPending: true, isError: false, error: null });
      try {
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

        const isRoomEmpty = updatedPlayers.length === 0;

        if (isRoomEmpty) {
          await deleteRoomMutation({ slug });
        } else {
          if (roomStatus === "playing") {
            // Mark game as ended by player leaving
            const endedGameState: GameState = {
              ...updatedGameState,
              endReason: "player_left",
              endedByPlayerName: currentGameState.players.find(p => p.id === currentPlayerId)?.name,
            };
            await updateGameStateMutation({ slug, gameState: endedGameState });
            await updateStatusMutation({ slug, status: "finished" });
          } else {
            await updateGameStateMutation({ slug, gameState: updatedGameState });
          }
        }

        localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
        localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
        setCurrentPlayerId(null);

        if (!isRoomEmpty) {
          updateGameState(updatedGameState);
        }
        setLeaveRoomState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
        navigate("/");
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to leave room");
        setLeaveRoomState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentRoom.status, currentPlayerId, updateGameStateMutation, updateStatusMutation, deleteRoomMutation, setCurrentPlayerId, updateGameState, navigate]),
  };

  const returnToLobby: MutationState<void> = {
    isPending: returnToLobbyState.isPending,
    isError: returnToLobbyState.isError,
    error: returnToLobbyState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setReturnToLobbyState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Room not found");
        const currentGameState = gameState ?? room.gameState;

        const resetPlayers = currentGameState.players.map((player) => ({
          ...player,
          hand: [],
          score: 0,
          lastSeen: player.isAI ? undefined : Date.now(),
          disconnectedAt: undefined,
        }));

        const resetGameState: GameState = {
          players: resetPlayers,
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
          endReason: undefined,
          endedByPlayerName: undefined,
        };

        await updateGameStateMutation({ slug, gameState: resetGameState });
        await updateStatusMutation({ slug, status: "waiting" });

        updateGameState(resetGameState);
        setCurrentRoom({
          roomId: room.id,
          slug: slug,
          status: "waiting",
        });
        setReturnToLobbyState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to return to lobby");
        setReturnToLobbyState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, updateGameStateMutation, updateStatusMutation, updateGameState, setCurrentRoom]),
  };

  return {
    joinRoom,
    addAIPlayers,
    updateAIDifficulty,
    startGame,
    leaveRoom,
    returnToLobby,
  };
}

interface AnimationCallbacks {
  setShowCompletedTrick: (show: boolean) => void;
  setAnimatingToWinner: (animating: boolean) => void;
  setSelectedCard: (card: Card | null) => void;
  isAnimatingRef: React.MutableRefObject<boolean>;
}

interface UseGameplayMutationsParams {
  slug: string | undefined;
  room: RoomData | null | undefined;
  gameState: GameState | null;
  currentRoom: CurrentRoomState;
  currentPlayerId: string | null;
  isTestMode: boolean;
  updateGameState: (gameState: GameState) => void;
  setSelectedCardsToPass: (cards: Card[]) => void;
  animationCallbacks: AnimationCallbacks;
}

export function useGameplayMutations({
  slug,
  room,
  gameState,
  currentRoom,
  currentPlayerId,
  isTestMode,
  updateGameState,
  setSelectedCardsToPass,
  animationCallbacks,
}: UseGameplayMutationsParams) {
  const updateGameStateMutation = useConvexMutation(api.rooms.updateGameState);
  const updateStatusMutation = useConvexMutation(api.rooms.updateStatus);

  const {
    setShowCompletedTrick,
    setAnimatingToWinner,
    setSelectedCard,
    isAnimatingRef,
  } = animationCallbacks;

  const [playCardState, setPlayCardState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [nextRoundState, setNextRoundState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [submitPassState, setSubmitPassState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [completeRevealState, setCompleteRevealState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [newGameState, setNewGameState] = useState({ isPending: false, isError: false, error: null as Error | null });

  const playCard: MutationState<{ card: Card; playerId?: string }> = {
    isPending: playCardState.isPending,
    isError: playCardState.isError,
    error: playCardState.error,
    mutate: useCallback(async (args?: { card: Card; playerId?: string }, options?: { onSuccess?: () => void }) => {
      if (!args) return;
      setPlayCardState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Not in room");
        const currentGameState = gameState ?? room.gameState;
        const roomStatus = currentRoom.status ?? room.status;

        if (roomStatus !== "playing") {
          throw new Error("Game is not in progress");
        }

        const targetPlayerId = args.playerId ?? currentPlayerId;
        if (!targetPlayerId) {
          throw new Error("No player ID provided");
        }

        const result = playCardFn(currentGameState, targetPlayerId, args.card);

        if (result.error) {
          throw new Error(result.error);
        }

        const finalGameState = updatePlayerLastSeen(
          result.gameState,
          targetPlayerId
        );

        const gameOver = finalGameState.scores.some((score) => score >= 100);
        if (gameOver) {
          await updateStatusMutation({ slug, status: "finished" });
        }

        await updateGameStateMutation({ slug, gameState: finalGameState });

        // Handle success logic
        updateGameState(finalGameState);
        setSelectedCard(null);

        if (!isTestMode) {
          playSound("cardPlay");

          const prevHeartsBroken = gameState?.heartsBroken ?? false;
          if (!prevHeartsBroken && finalGameState.heartsBroken) {
            setTimeout(() => playSound("heartsBroken"), 200);
          }
        }

        const trickJustCompleted =
          finalGameState.lastCompletedTrick &&
          finalGameState.lastCompletedTrick.length === 4 &&
          finalGameState.currentTrick.length === 0;

        if (trickJustCompleted) {
          const completedTrickNumber =
            (finalGameState.currentTrickNumber ?? 1) - 1;
          notifyTrickComplete(
            finalGameState,
            finalGameState.lastCompletedTrick!,
            finalGameState.lastTrickWinnerIndex!,
            completedTrickNumber
          );

          if (!isTestMode) {
            setTimeout(() => playSound("trickWin"), 400);

            setShowCompletedTrick(true);
            setAnimatingToWinner(false);
            isAnimatingRef.current = true;

            setTimeout(() => {
              setAnimatingToWinner(true);

              setTimeout(() => {
                setShowCompletedTrick(false);
                setAnimatingToWinner(false);
                isAnimatingRef.current = false;

                if (
                  finalGameState.isGameOver &&
                  finalGameState.winnerIndex !== undefined
                ) {
                  playSound("gameEnd");
                } else if (finalGameState.isRoundComplete) {
                  const moonCheck = checkShootingTheMoon(
                    finalGameState.roundScores
                  );
                  if (moonCheck.shot) {
                    playSound("shootTheMoon");
                  }
                }
              }, 1000);
            }, 600);
          }
        }

        setPlayCardState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to play card");
        setPlayCardState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentRoom.status, currentPlayerId, isTestMode, updateGameStateMutation, updateStatusMutation, updateGameState, setSelectedCard, setShowCompletedTrick, setAnimatingToWinner, isAnimatingRef]),
  };

  const nextRound: MutationState<void> = {
    isPending: nextRoundState.isPending,
    isError: nextRoundState.isError,
    error: nextRoundState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setNextRoundState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Room not found");
        const currentGameState = gameState ?? room.gameState;

        const newHands = createAndDeal();
        let updatedGameState = prepareNewRound(currentGameState, newHands);
        resetAIForNewRound(updatedGameState);

        if (updatedGameState.isPassingPhase) {
          updatedGameState = processAIPassesAndFinalize(
            updatedGameState,
            chooseAICardsToPass,
            finalizePassingPhase
          );
        }

        await updateGameStateMutation({ slug, gameState: updatedGameState });

        setSelectedCardsToPass([]);
        updateGameState(updatedGameState);
        setNextRoundState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to start next round");
        setNextRoundState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, updateGameStateMutation, setSelectedCardsToPass, updateGameState]),
  };

  const submitPass: MutationState<Card[]> = {
    isPending: submitPassState.isPending,
    isError: submitPassState.isError,
    error: submitPassState.error,
    mutate: useCallback(async (cards?: Card[], options?: { onSuccess?: () => void }) => {
      if (!cards) return;
      setSubmitPassState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room || !currentPlayerId) throw new Error("Not in room");
        const currentGameState = gameState ?? room.gameState;

        const result = submitPassSelection(
          currentGameState,
          currentPlayerId,
          cards
        );
        if (result.error) {
          throw new Error(result.error);
        }

        let updatedGameState = result.gameState;

        updatedGameState = updatePlayerLastSeen(
          updatedGameState,
          currentPlayerId
        );

        if (allPlayersHavePassed(updatedGameState)) {
          const executeResult = executePassPhase(updatedGameState);
          if (executeResult.error) {
            throw new Error(executeResult.error);
          }
          updatedGameState = executeResult.gameState;
        }

        await updateGameStateMutation({ slug, gameState: updatedGameState });
        updateGameState(updatedGameState);
        setSubmitPassState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to submit pass");
        setSubmitPassState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentPlayerId, updateGameStateMutation, updateGameState]),
  };

  const completeReveal: MutationState<void> = {
    isPending: completeRevealState.isPending,
    isError: completeRevealState.isError,
    error: completeRevealState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setCompleteRevealState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room || !currentPlayerId) throw new Error("Not in room");
        const currentGameState = gameState ?? room.gameState;

        let updatedGameState = markPlayerReadyForReveal(
          currentGameState,
          currentPlayerId
        );

        updatedGameState = updatePlayerLastSeen(
          updatedGameState,
          currentPlayerId
        );

        await updateGameStateMutation({ slug, gameState: updatedGameState });
        setSelectedCardsToPass([]);
        updateGameState(updatedGameState);
        setCompleteRevealState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to complete reveal");
        setCompleteRevealState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, currentPlayerId, updateGameStateMutation, setSelectedCardsToPass, updateGameState]),
  };

  const newGame: MutationState<void> = {
    isPending: newGameState.isPending,
    isError: newGameState.isError,
    error: newGameState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setNewGameState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !room) throw new Error("Room not found");
        const currentGameState = gameState ?? room.gameState;

        const newHands = createAndDeal();
        let updatedGameState = resetGameForNewGame(currentGameState, newHands);

        if (updatedGameState.isPassingPhase) {
          updatedGameState = processAIPassesAndFinalize(
            updatedGameState,
            chooseAICardsToPass,
            finalizePassingPhase
          );
        }

        await updateStatusMutation({ slug, status: "playing" });
        await updateGameStateMutation({ slug, gameState: updatedGameState });

        setSelectedCardsToPass([]);
        useAIDebugStore.getState().clearLogs();
        updateGameState(updatedGameState);
        setNewGameState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to start new game");
        setNewGameState({ isPending: false, isError: true, error: err });
      }
    }, [slug, room, gameState, updateGameStateMutation, updateStatusMutation, setSelectedCardsToPass, updateGameState]),
  };

  return {
    playCard,
    nextRound,
    submitPass,
    completeReveal,
    newGame,
  };
}

interface UseSpectatorMutationsParams {
  slug: string | undefined;
  spectatorId: string | null;
  setSpectatorId: (id: string | null) => void;
  setSpectators: (spectators: Spectator[]) => void;
}

export function useSpectatorMutations({
  slug,
  spectatorId,
  setSpectatorId,
  setSpectators,
}: UseSpectatorMutationsParams) {
  const joinAsSpectatorMutation = useConvexMutation(api.rooms.joinAsSpectator);
  const leaveAsSpectatorMutation = useConvexMutation(api.rooms.leaveAsSpectator);

  const [joinState, setJoinState] = useState({ isPending: false, isError: false, error: null as Error | null });
  const [leaveState, setLeaveState] = useState({ isPending: false, isError: false, error: null as Error | null });

  const joinSpectator: MutationState<string> = {
    isPending: joinState.isPending,
    isError: joinState.isError,
    error: joinState.error,
    mutate: useCallback(async (spectatorName?: string, options?: { onSuccess?: () => void }) => {
      if (!spectatorName) return;
      setJoinState({ isPending: true, isError: false, error: null });
      try {
        if (!slug) throw new Error("Room not found");

        const newSpectatorId = `spectator-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        const spectator: Spectator = {
          id: newSpectatorId,
          name: spectatorName,
        };

        const updatedSpectators = await joinAsSpectatorMutation({ slug, spectator });

        localStorage.setItem(STORAGE_KEYS.SPECTATOR_ID, newSpectatorId);
        localStorage.setItem(STORAGE_KEYS.SPECTATOR_NAME, spectatorName);
        setSpectatorId(newSpectatorId);
        setSpectators(updatedSpectators);
        setJoinState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to join as spectator");
        setJoinState({ isPending: false, isError: true, error: err });
      }
    }, [slug, joinAsSpectatorMutation, setSpectatorId, setSpectators]),
  };

  const leaveSpectator: MutationState<void> = {
    isPending: leaveState.isPending,
    isError: leaveState.isError,
    error: leaveState.error,
    mutate: useCallback(async (_?: void, options?: { onSuccess?: () => void }) => {
      setLeaveState({ isPending: true, isError: false, error: null });
      try {
        if (!slug || !spectatorId) throw new Error("Not spectating");

        const updatedSpectators = await leaveAsSpectatorMutation({ slug, spectatorId });

        localStorage.removeItem(STORAGE_KEYS.SPECTATOR_ID);
        localStorage.removeItem(STORAGE_KEYS.SPECTATOR_NAME);
        setSpectatorId(null);
        setSpectators(updatedSpectators);
        setLeaveState({ isPending: false, isError: false, error: null });
        options?.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to leave spectator");
        setLeaveState({ isPending: false, isError: true, error: err });
      }
    }, [slug, spectatorId, leaveAsSpectatorMutation, setSpectatorId, setSpectators]),
  };

  return {
    joinSpectator,
    leaveSpectator,
  };
}
