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
}

export interface GameRoom {
  id: string;
  slug: string;
  createdAt?: string;
  gameState: GameState;
  status: "waiting" | "playing" | "finished";
}
