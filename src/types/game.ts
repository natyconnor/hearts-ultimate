// Card game types for Hearts

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

export interface Card {
  suit: CardSuit;
  rank: CardRank;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  hand: Card[];
  score: number;
}

// Pass direction rotates each round: left, right, across, none (hold)
export type PassDirection = "left" | "right" | "across" | "none";

// Tracks which cards each player has selected/submitted to pass
export interface PassSubmission {
  playerId: string;
  cards: Card[];
}

export interface GameState {
  players: Player[];
  hands: Card[][]; // Array of hands, one per player (indexed by player index)
  currentTrick: Array<{ playerId: string; card: Card }>;
  lastCompletedTrick?: Array<{ playerId: string; card: Card }>; // The last completed trick (for animation)
  lastTrickWinnerIndex?: number; // The player index who won the last trick
  scores: number[]; // Cumulative game scores
  roundScores: number[]; // Scores for current round
  heartsBroken: boolean;
  currentPlayerIndex?: number;
  dealerIndex?: number;
  trickLeaderIndex?: number; // Index of player who led the current trick
  roundNumber: number; // Current round number (1-based)
  isRoundComplete?: boolean; // Flag to indicate round just completed (for UI)
  isGameOver?: boolean; // Flag to indicate game has ended (someone reached 100+ points)
  winnerIndex?: number; // Index of the winning player (lowest score when game ends)
  // Passing phase fields
  passDirection?: PassDirection; // Current round's pass direction
  isPassingPhase?: boolean; // True when in passing phase, false during play
  passSubmissions?: PassSubmission[]; // Cards each player has submitted to pass

  // Reveal phase fields (after passing, before play)
  isRevealPhase?: boolean; // True when showing received cards
  receivedCards?: Card[][]; // Cards each player received (indexed by player index)
}

export interface GameRoom {
  id: string;
  slug: string;
  createdAt?: string;
  gameState: GameState;
  status: "waiting" | "playing" | "finished";
}
