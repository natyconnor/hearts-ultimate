// Card game types for Hearts

export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

/**
 * Minimal card identity - just suit and rank.
 * Use this when you only need to identify/compare cards, not calculate points.
 */
export interface CardIdentity {
  suit: CardSuit;
  rank: CardRank;
}

export interface Card extends CardIdentity {
  /** Penalty points this card is worth in Hearts (0, 1 for hearts, 13 for Q♠) */
  points: number;
}

// AI difficulty levels
export type AIDifficulty = "easy" | "medium" | "hard";

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  difficulty?: AIDifficulty; // Only for AI players
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
  currentTrickNumber: number; // Current trick number within the round (1-based, resets to 1 each round)
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

  // Points cards taken during the round (for round summary)
  // Only contains penalty cards: hearts (1pt each) and Queen of Spades (13pts)
  // All penalty cards from a trick go to the trick winner
  pointsCardsTaken?: Card[][]; // Penalty cards taken by each player (indexed by player index)

  // History of scores from all completed rounds (for round summary)
  roundHistory?: RoundScoreRecord[];

  // Moon shooting tracking (set BEFORE scores are adjusted)
  shotTheMoon?: { playerIndex: number } | null;
}

/** Scores from a completed round, stored in round history */
export interface RoundScoreRecord {
  /** Which round number this was */
  roundNumber: number;
  /** Scores each player earned this round (indexed by player index) */
  scores: number[];
  /** Whether someone shot the moon this round */
  shotTheMoon?: { playerIndex: number } | null;
}

export interface Spectator {
  id: string;
  name: string;
}

export interface GameRoom {
  id: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  gameState: GameState;
  status: "waiting" | "playing" | "finished";
  spectators: Spectator[];
}
