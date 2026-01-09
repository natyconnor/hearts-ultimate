import { create } from "zustand";
import type { GameState, Player, Card, Spectator } from "../types/game";

interface CurrentRoom {
  roomId: string | null;
  slug: string | null;
  status: "waiting" | "playing" | "finished" | null;
}

interface RoomData {
  roomId: string;
  slug: string;
  status: "waiting" | "playing" | "finished";
}

interface GameStore {
  currentRoom: CurrentRoom;
  players: Player[];
  spectators: Spectator[];
  gameState: GameState | null;
  ui: {
    isLoading: boolean;
    error: string | null;
  };
  setCurrentRoom: (roomData: RoomData) => void;
  updateGameState: (newGameState: GameState) => void;
  updateSpectators: (spectators: Spectator[]) => void;
  addPlayer: (playerName: string, isAI: boolean) => void;
  playCard: (playerId: string, card: Card) => void;
  resetGame: () => void;
  clearCurrentRoom: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialState = {
  currentRoom: {
    roomId: null,
    slug: null,
    status: null,
  },
  players: [],
  spectators: [],
  gameState: null,
  ui: {
    isLoading: false,
    error: null,
  },
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setCurrentRoom: (roomData) =>
    set({
      currentRoom: {
        roomId: roomData.roomId,
        slug: roomData.slug,
        status: roomData.status,
      },
    }),

  updateGameState: (newGameState) =>
    set({
      gameState: newGameState,
      players: newGameState.players,
    }),

  updateSpectators: (spectators) =>
    set({
      spectators,
    }),

  addPlayer: (playerName, isAI) =>
    set((state) => {
      const newPlayer: Player = {
        id: `player-${Date.now()}-${Math.random()}`,
        name: playerName,
        isAI,
        hand: [],
        score: 0,
      };
      const updatedPlayers = [...state.players, newPlayer];
      const updatedGameState: GameState = state.gameState
        ? {
            ...state.gameState,
            players: updatedPlayers,
          }
        : {
            players: updatedPlayers,
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
          };
      return {
        players: updatedPlayers,
        gameState: updatedGameState,
      };
    }),

  playCard: (playerId, card) =>
    set((state) => {
      if (!state.gameState) return state;
      const updatedTrick = [
        ...state.gameState.currentTrick,
        { playerId, card },
      ];
      return {
        gameState: {
          ...state.gameState,
          currentTrick: updatedTrick,
        },
      };
    }),

  resetGame: () => set(initialState),

  clearCurrentRoom: () =>
    set({
      currentRoom: {
        roomId: null,
        slug: null,
        status: null,
      },
      spectators: [],
    }),

  setLoading: (isLoading) =>
    set((state) => ({
      ui: {
        ...state.ui,
        isLoading,
      },
    })),

  setError: (error) =>
    set((state) => ({
      ui: {
        ...state.ui,
        error,
      },
    })),
}));
