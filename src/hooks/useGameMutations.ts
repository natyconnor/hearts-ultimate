import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  updateRoomGameState,
  updateRoomStatus,
  deleteRoom,
  joinAsSpectator,
  leaveAsSpectator,
} from "../lib/roomApi";
import { createAIPlayersToFillSlots } from "../lib/aiPlayers";
import { createAndDeal } from "../game/deck";
import {
  prepareNewRound,
  resetGameForNewGame,
  startRoundWithPassingPhase,
  completeRevealPhase,
  finalizePassingPhase,
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
import type { GameState, Player, Card, AIDifficulty, Spectator } from "../types/game";

interface RoomData {
  id: string;
  slug: string;
  status: "waiting" | "playing" | "finished";
  gameState: GameState;
}

interface CurrentRoomState {
  status: "waiting" | "playing" | "finished" | null;
}

interface UseLobbyMutationsParams {
  slug: string | undefined;
  room: RoomData | null | undefined;
  gameState: GameState | null;
  currentRoom: CurrentRoomState;
  currentPlayerId: string | null;
  updateGameState: (gameState: GameState) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setCurrentRoom: (room: { roomId: string; slug: string; status: "waiting" | "playing" | "finished" }) => void;
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
  const queryClient = useQueryClient();

  const joinRoom = useMutation({
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

  const addAIPlayers = useMutation({
    mutationFn: async () => {
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

      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const updateAIDifficulty = useMutation({
    mutationFn: async ({
      playerId,
      difficulty,
    }: {
      playerId: string;
      difficulty: AIDifficulty;
    }) => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "waiting")
        throw new Error("Cannot change difficulty after game started");

      const playerIndex = currentGameState.players.findIndex(
        (p) => p.id === playerId
      );
      if (playerIndex === -1) throw new Error("Player not found");
      if (!currentGameState.players[playerIndex].isAI)
        throw new Error("Can only change difficulty for AI players");

      const updatedPlayers = [...currentGameState.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        difficulty,
      };

      const updatedGameState: GameState = {
        ...currentGameState,
        players: updatedPlayers,
      };

      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const startGame = useMutation({
    mutationFn: async () => {
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
      setSelectedCardsToPass([]);
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const leaveRoom = useMutation({
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

      const isRoomEmpty = updatedPlayers.length === 0;

      if (isRoomEmpty) {
        await deleteRoom(slug);
      } else {
        if (roomStatus === "playing") {
          await updateRoomStatus(slug, "finished");
        }
        await updateRoomGameState(slug, updatedGameState);
      }

      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
      setCurrentPlayerId(null);

      return {
        updatedGameState,
        endedGame: roomStatus === "playing",
        roomDeleted: isRoomEmpty,
      };
    },
    onSuccess: (result) => {
      if (!result.roomDeleted) {
        updateGameState(result.updatedGameState);
      }
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
      if (result.endedGame) {
        alert("A player left the game. The game has ended.");
      }
      navigate("/");
    },
  });

  return {
    joinRoom,
    addAIPlayers,
    updateAIDifficulty,
    startGame,
    leaveRoom,
  };
}

interface AnimationCallbacks {
  setShowCompletedTrick: (show: boolean) => void;
  setAnimatingToWinner: (animating: boolean) => void;
  setShowRoundSummary: (show: boolean) => void;
  setShowGameEnd: (show: boolean) => void;
  setSelectedCard: (card: Card | null) => void;
  isAnimatingRef: React.MutableRefObject<boolean>;
  showRoundSummaryRef: React.MutableRefObject<boolean>;
  showGameEndRef: React.MutableRefObject<boolean>;
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
  const queryClient = useQueryClient();
  const {
    setShowCompletedTrick,
    setAnimatingToWinner,
    setShowRoundSummary,
    setShowGameEnd,
    setSelectedCard,
    isAnimatingRef,
    showRoundSummaryRef,
    showGameEndRef,
  } = animationCallbacks;

  const playCard = useMutation({
    mutationFn: async ({
      card,
      playerId,
    }: {
      card: Card;
      playerId?: string;
    }) => {
      if (!slug || !room) throw new Error("Not in room");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "playing") {
        throw new Error("Game is not in progress");
      }

      const targetPlayerId = playerId ?? currentPlayerId;
      if (!targetPlayerId) {
        throw new Error("No player ID provided");
      }

      const { playCard: playCardFn } = await import("../game/gameLogic");
      const result = playCardFn(currentGameState, targetPlayerId, card);

      if (result.error) {
        throw new Error(result.error);
      }

      const gameOver = result.gameState.scores.some((score) => score >= 100);
      if (gameOver) {
        await updateRoomStatus(slug, "finished");
      }

      await updateRoomGameState(slug, result.gameState);

      return result.gameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
      setSelectedCard(null);

      if (!isTestMode) {
        playSound("cardPlay");

        const prevHeartsBroken = gameState?.heartsBroken ?? false;
        if (!prevHeartsBroken && updatedGameState.heartsBroken) {
          setTimeout(() => playSound("heartsBroken"), 200);
        }
      }

      const trickJustCompleted =
        updatedGameState.lastCompletedTrick &&
        updatedGameState.lastCompletedTrick.length === 4 &&
        updatedGameState.currentTrick.length === 0;

      if (trickJustCompleted) {
        const completedTrickNumber =
          (updatedGameState.currentTrickNumber ?? 1) - 1;
        notifyTrickComplete(
          updatedGameState,
          updatedGameState.lastCompletedTrick!,
          updatedGameState.lastTrickWinnerIndex!,
          completedTrickNumber
        );

        if (isTestMode) {
          if (
            updatedGameState.isGameOver &&
            updatedGameState.winnerIndex !== undefined
          ) {
            setShowGameEnd(true);
            showGameEndRef.current = true;
          } else if (updatedGameState.isRoundComplete) {
            setShowRoundSummary(true);
            showRoundSummaryRef.current = true;
          }
        } else {
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
                updatedGameState.isGameOver &&
                updatedGameState.winnerIndex !== undefined
              ) {
                playSound("gameEnd");
                setShowGameEnd(true);
                showGameEndRef.current = true;
              } else if (updatedGameState.isRoundComplete) {
                const moonCheck = checkShootingTheMoon(
                  updatedGameState.roundScores
                );
                if (moonCheck.shot) {
                  playSound("shootTheMoon");
                }
                setShowRoundSummary(true);
                showRoundSummaryRef.current = true;
              }
            }, 1000);
          }, 600);
        }
      }
    },
  });

  const nextRound = useMutation({
    mutationFn: async () => {
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

      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setShowRoundSummary(false);
      showRoundSummaryRef.current = false;
      setSelectedCardsToPass([]);
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const submitPass = useMutation({
    mutationFn: async (cards: Card[]) => {
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

      if (allPlayersHavePassed(updatedGameState)) {
        const executeResult = executePassPhase(updatedGameState);
        if (executeResult.error) {
          throw new Error(executeResult.error);
        }
        updatedGameState = executeResult.gameState;
      }

      await updateRoomGameState(slug, updatedGameState);
      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const completeReveal = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;

      const updatedGameState = completeRevealPhase(currentGameState);

      await updateRoomGameState(slug, updatedGameState);
      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setSelectedCardsToPass([]);
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const newGame = useMutation({
    mutationFn: async () => {
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

      await updateRoomStatus(slug, "playing");
      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setShowGameEnd(false);
      showGameEndRef.current = false;
      setSelectedCardsToPass([]);
      useAIDebugStore.getState().clearLogs();
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const joinSpectator = useMutation({
    mutationFn: async (spectatorName: string) => {
      if (!slug) throw new Error("Room not found");

      const newSpectatorId = `spectator-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const spectator: Spectator = {
        id: newSpectatorId,
        name: spectatorName,
      };

      const updatedSpectators = await joinAsSpectator(slug, spectator);

      localStorage.setItem(STORAGE_KEYS.SPECTATOR_ID, newSpectatorId);
      localStorage.setItem(STORAGE_KEYS.SPECTATOR_NAME, spectatorName);
      setSpectatorId(newSpectatorId);

      return updatedSpectators;
    },
    onSuccess: (updatedSpectators) => {
      setSpectators(updatedSpectators);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const leaveSpectator = useMutation({
    mutationFn: async () => {
      if (!slug || !spectatorId) throw new Error("Not spectating");

      const updatedSpectators = await leaveAsSpectator(slug, spectatorId);

      localStorage.removeItem(STORAGE_KEYS.SPECTATOR_ID);
      localStorage.removeItem(STORAGE_KEYS.SPECTATOR_NAME);
      setSpectatorId(null);

      return updatedSpectators;
    },
    onSuccess: (updatedSpectators) => {
      setSpectators(updatedSpectators);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
      navigate("/");
    },
  });

  return {
    joinSpectator,
    leaveSpectator,
  };
}
