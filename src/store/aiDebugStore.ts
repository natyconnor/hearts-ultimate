import { create } from "zustand";
import type { Card, AIDifficulty } from "../types/game";
import type { ScoredCard } from "../lib/ai/types";

export interface AIDebugLog {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  difficulty: AIDifficulty;
  actionType: "pass" | "play";
  roundNumber: number;
  trickNumber?: number;
  decision: Card | Card[]; // The card(s) chosen
  consideredCards: ScoredCard[]; // All valid cards with their scores and reasons
  contextInfo?: string; // e.g., "Leading trick", "Following Hearts"
  memorySnapshot?: {
    voidSuits?: Record<string, string[]>;
    cardsRememberedCount?: number;
    moonShooterCandidate?: string | null;
    // Moon shooting attempt tracking
    attemptingMoon?: boolean;
    moonConfidence?: number;
    moonReasons?: string[];
    // Memory stats (from CardMemory.getSnapshot())
    cardsTracked?: number;
    tricksCounted?: number;
    voidPlayers?: string[];
  };
  aiVersion: number; // Version of AI code that generated this log
}

interface AIDebugStore {
  logs: AIDebugLog[];
  isOpen: boolean;
  addLog: (log: Omit<AIDebugLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
}

export const useAIDebugStore = create<AIDebugStore>((set) => ({
  logs: [],
  isOpen: false, // Default to closed
  addLog: (logData) =>
    set((state) => ({
      logs: [
        {
          ...logData,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...state.logs,
      ],
      // No cap - allow full game logs to be copied
      // In practice, a full game might generate ~200-400 logs (52 cards + passing phases)
    })),
  clearLogs: () => set({ logs: [] }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
}));
