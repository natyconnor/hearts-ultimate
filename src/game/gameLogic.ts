import type { Card, GameState, RoundScoreRecord } from "../types/game";
import {
  canPlayCard,
  getTrickWinner,
  shouldBreakHearts,
  isRoundComplete,
  checkShootingTheMoon,
  applyShootingTheMoon,
  getNextPlayerIndex,
  findPlayerWithTwoOfClubs,
  isFirstTrick,
  isPenaltyCard,
} from "./rules";
import { getPassDirection } from "./passingLogic";
import { cardsEqual } from "./cardDisplay";
import { GAME_CONFIG } from "../lib/constants";

/**
 * Plays a card and updates the game state
 * Returns the updated game state
 */
export function playCard(
  gameState: GameState,
  playerId: string,
  card: Card
): { gameState: GameState; error?: string } {
  // Find the player
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { gameState, error: "Player not found" };
  }

  const player = gameState.players[playerIndex];

  // Check if it's this player's turn
  if (gameState.currentPlayerIndex !== playerIndex) {
    return { gameState, error: "Not your turn" };
  }

  // Validate the card can be played
  const firstTrick = isFirstTrick(gameState);
  const validation = canPlayCard(
    card,
    player.hand,
    gameState.currentTrick,
    gameState.heartsBroken,
    firstTrick
  );

  if (!validation.valid) {
    return { gameState, error: validation.reason };
  }

  // Remove card from hand
  const updatedHand = player.hand.filter((c) => !cardsEqual(c, card));

  // Update player's hand
  const updatedPlayers = [...gameState.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: updatedHand,
  };

  // Update hands array
  const updatedHands = [...gameState.hands];
  updatedHands[playerIndex] = updatedHand;

  // Add card to trick
  const updatedTrick = [...gameState.currentTrick, { playerId, card }];

  // Update hearts broken status
  const newHeartsBroken = shouldBreakHearts(card, gameState.heartsBroken);

  // Check if trick is complete (all 4 players have played)
  const trickComplete = updatedTrick.length === 4;

  // Initialize pointsCardsTaken if not present
  const pointsCardsTaken = gameState.pointsCardsTaken ?? [[], [], [], []];

  let finalGameState: GameState = {
    ...gameState,
    players: updatedPlayers,
    hands: updatedHands,
    currentTrick: updatedTrick,
    heartsBroken: newHeartsBroken,
    pointsCardsTaken,
  };

  if (trickComplete) {
    // Determine trick winner
    const winnerIndex = getTrickWinner(updatedTrick);
    const winnerPlayerId = updatedTrick[winnerIndex].playerId;
    const winnerPlayerIndex = updatedPlayers.findIndex(
      (p) => p.id === winnerPlayerId
    );

    // Track penalty cards taken by the winner (only penalty cards: hearts + Q♠)
    const updatedPointsCardsTaken = gameState.pointsCardsTaken
      ? gameState.pointsCardsTaken.map((cards) => [...cards])
      : [[], [], [], []]; // Initialize if not present

    // Calculate total points from penalty cards in this trick
    // All penalty cards in a trick go to the winner
    let trickPointsTotal = 0;
    updatedTrick.forEach(({ card }) => {
      if (isPenaltyCard(card)) {
        updatedPointsCardsTaken[winnerPlayerIndex].push(card);
        // Count points: hearts = 1pt each, Q♠ = 13pts
        if (card.suit === "hearts") {
          trickPointsTotal += 1;
        } else if (card.suit === "spades" && card.rank === 12) {
          trickPointsTotal += 13;
        }
      }
    });

    // Update round scores - all points from this trick go to the winner
    const updatedRoundScores = [...gameState.roundScores];
    updatedRoundScores[winnerPlayerIndex] += trickPointsTotal;

    // Check if round is complete
    const roundComplete = isRoundComplete(finalGameState);

    if (roundComplete) {
      // Check for shooting the moon
      const moonCheck = checkShootingTheMoon(updatedRoundScores);
      const finalRoundScores = moonCheck.shot
        ? applyShootingTheMoon(updatedRoundScores, moonCheck.playerIndex!)
        : updatedRoundScores;

      // Update cumulative scores
      const updatedScores = gameState.scores.map(
        (score, index) => score + finalRoundScores[index]
      );

      // Check if game is over (someone has reached the game end score)
      const gameOver = updatedScores.some(
        (score) => score >= GAME_CONFIG.GAME_END_SCORE
      );

      // Find game winner (player with lowest score)
      let gameWinnerIndex: number | undefined;
      if (gameOver) {
        const minScore = Math.min(...updatedScores);
        gameWinnerIndex = updatedScores.findIndex(
          (score) => score === minScore
        );
      }

      // Record this round in history
      const roundRecord: RoundScoreRecord = {
        roundNumber: gameState.roundNumber,
        scores: finalRoundScores,
        shotTheMoon: moonCheck.shot
          ? { playerIndex: moonCheck.playerIndex! }
          : null,
      };
      const updatedRoundHistory = [
        ...(gameState.roundHistory ?? []),
        roundRecord,
      ];

      finalGameState = {
        ...finalGameState,
        currentTrick: [],
        lastCompletedTrick: updatedTrick,
        lastTrickWinnerIndex: winnerPlayerIndex,
        roundScores: finalRoundScores,
        scores: updatedScores,
        currentPlayerIndex: undefined,
        trickLeaderIndex: undefined,
        isRoundComplete: true,
        isGameOver: gameOver,
        winnerIndex: gameWinnerIndex,
        pointsCardsTaken: updatedPointsCardsTaken,
        roundHistory: updatedRoundHistory,
        // Store moon shot info BEFORE scores are adjusted
        shotTheMoon: moonCheck.shot
          ? { playerIndex: moonCheck.playerIndex! }
          : null,
      };

      // If game is over, we'll handle status update in the component
      return { gameState: finalGameState };
    }

    // Move to next trick - winner leads
    // Save the completed trick for animation before clearing
    finalGameState = {
      ...finalGameState,
      currentTrick: [],
      lastCompletedTrick: updatedTrick,
      lastTrickWinnerIndex: winnerPlayerIndex,
      roundScores: updatedRoundScores,
      currentPlayerIndex: winnerPlayerIndex,
      trickLeaderIndex: winnerPlayerIndex,
      currentTrickNumber: (gameState.currentTrickNumber ?? 1) + 1, // Increment trick number
      pointsCardsTaken: updatedPointsCardsTaken,
    };
  } else {
    // Move to next player
    const nextPlayerIndex = getNextPlayerIndex(
      playerIndex,
      gameState.players.length
    );

    // If this was the first card of the trick, set trick leader
    const trickLeader =
      updatedTrick.length === 1 ? playerIndex : gameState.trickLeaderIndex;

    finalGameState = {
      ...finalGameState,
      currentPlayerIndex: nextPlayerIndex,
      trickLeaderIndex: trickLeader,
    };
  }

  return { gameState: finalGameState };
}

/**
 * Initializes the game state for a new round
 * Sets the first player (who has 2 of clubs)
 */
export function initializeRound(gameState: GameState): GameState {
  const firstPlayerIndex = findPlayerWithTwoOfClubs(gameState);

  return {
    ...gameState,
    currentPlayerIndex: firstPlayerIndex,
    trickLeaderIndex: undefined,
    currentTrick: [],
    lastCompletedTrick: undefined,
    lastTrickWinnerIndex: undefined,
    roundScores: [0, 0, 0, 0],
    heartsBroken: false,
    currentTrickNumber: 1, // Start at trick 1
    isRoundComplete: false,
    isGameOver: false,
    winnerIndex: undefined,
    isPassingPhase: false,
    passSubmissions: undefined,
  };
}

/**
 * Starts a round with the passing phase (or skips to play if direction is "none")
 * Called when starting the game initially
 */
export function startRoundWithPassingPhase(
  gameState: GameState,
  newHands: Card[][]
): GameState {
  const passDirection = getPassDirection(gameState.roundNumber);

  // Assign hands to players
  const playersWithHands = gameState.players.map((player, index) => ({
    ...player,
    hand: newHands[index],
  }));

  const newGameState: GameState = {
    ...gameState,
    players: playersWithHands,
    hands: newHands,
    passDirection,
    isPassingPhase: passDirection !== "none",
    passSubmissions: passDirection !== "none" ? [] : undefined,
    pointsCardsTaken: [[], [], [], []], // Initialize points cards taken for new round
    roundHistory: [], // Initialize round history for new game
  };

  // If no passing this round, initialize for play immediately
  if (passDirection === "none") {
    return initializeRound(newGameState);
  }

  // Stay in passing phase - don't set current player yet
  return {
    ...newGameState,
    currentPlayerIndex: undefined,
    trickLeaderIndex: undefined,
    currentTrick: [],
    lastCompletedTrick: undefined,
    lastTrickWinnerIndex: undefined,
    roundScores: [0, 0, 0, 0],
    heartsBroken: false,
    currentTrickNumber: 1, // Will start at trick 1 when play begins
    isRoundComplete: false,
    isGameOver: false,
    winnerIndex: undefined,
  };
}

/**
 * Finalizes the passing phase and transitions to play
 * Called after all passes have been executed (skips reveal phase for AI-only games)
 */
export function finalizePassingPhase(gameState: GameState): GameState {
  return initializeRound({
    ...gameState,
    isRevealPhase: false,
    receivedCards: undefined,
  });
}

/**
 * Marks a player as ready during the reveal phase.
 * Returns updated game state, potentially transitioning to play if all human players are ready.
 */
export function markPlayerReadyForReveal(
  gameState: GameState,
  playerId: string
): GameState {
  if (!gameState.isRevealPhase) {
    return gameState;
  }

  const currentReadyIds = gameState.revealReadyPlayerIds ?? [];

  // Already marked as ready
  if (currentReadyIds.includes(playerId)) {
    return gameState;
  }

  const updatedReadyIds = [...currentReadyIds, playerId];

  // Check if all human players are now ready
  const humanPlayers = gameState.players.filter((p) => !p.isAI);
  const allHumansReady = humanPlayers.every((p) =>
    updatedReadyIds.includes(p.id)
  );

  if (allHumansReady) {
    // All humans ready - transition to play
    return initializeRound({
      ...gameState,
      isRevealPhase: false,
      receivedCards: undefined,
      revealReadyPlayerIds: undefined,
    });
  }

  // Not all ready yet - just update the ready list
  return {
    ...gameState,
    revealReadyPlayerIds: updatedReadyIds,
  };
}

/**
 * Checks if a player has marked themselves as ready during reveal phase
 */
export function hasPlayerConfirmedReveal(
  gameState: GameState,
  playerId: string
): boolean {
  return gameState.revealReadyPlayerIds?.includes(playerId) ?? false;
}

/**
 * @deprecated Use markPlayerReadyForReveal instead for proper per-player tracking
 * Completes the reveal phase and starts play (legacy - used for AI-only transitions)
 */
export function completeRevealPhase(gameState: GameState): GameState {
  return initializeRound({
    ...gameState,
    isRevealPhase: false,
    receivedCards: undefined,
    revealReadyPlayerIds: undefined,
  });
}

/**
 * Prepares a new round after the previous round ends
 * Deals new cards and sets up for passing phase (or play if no passing)
 */
export function prepareNewRound(
  gameState: GameState,
  newHands: Card[][]
): GameState {
  const newRoundNumber = gameState.roundNumber + 1;
  const passDirection = getPassDirection(newRoundNumber);

  // Assign hands to players
  const playersWithHands = gameState.players.map((player, index) => ({
    ...player,
    hand: newHands[index],
  }));

  const newGameState: GameState = {
    ...gameState,
    players: playersWithHands,
    hands: newHands,
    roundNumber: newRoundNumber,
    isRoundComplete: false,
    passDirection,
    isPassingPhase: passDirection !== "none",
    pointsCardsTaken: [[], [], [], []], // Initialize points cards taken for new round
    // Note: roundHistory is NOT reset here - it persists across rounds
    passSubmissions: passDirection !== "none" ? [] : undefined,
  };

  // If no passing this round, initialize for play immediately
  if (passDirection === "none") {
    return initializeRound(newGameState);
  }

  // Otherwise, stay in passing phase (don't set currentPlayerIndex yet)
  return {
    ...newGameState,
    currentPlayerIndex: undefined,
    trickLeaderIndex: undefined,
    currentTrick: [],
    lastCompletedTrick: undefined,
    lastTrickWinnerIndex: undefined,
    roundScores: [0, 0, 0, 0],
    heartsBroken: false,
  };
}

/**
 * Resets the game for a completely new game with the same players
 */
export function resetGameForNewGame(
  gameState: GameState,
  newHands: Card[][]
): GameState {
  const passDirection = getPassDirection(1); // Round 1 = pass left

  // Assign hands to players and reset scores
  const playersWithHands = gameState.players.map((player, index) => ({
    ...player,
    hand: newHands[index],
    score: 0,
  }));

  const newGameState: GameState = {
    ...gameState,
    players: playersWithHands,
    hands: newHands,
    scores: [0, 0, 0, 0],
    roundScores: [0, 0, 0, 0],
    roundNumber: 1,
    currentTrickNumber: 1,
    isRoundComplete: false,
    isGameOver: false,
    winnerIndex: undefined,
    passDirection,
    isPassingPhase: passDirection !== "none",
    passSubmissions: passDirection !== "none" ? [] : undefined,
    pointsCardsTaken: [[], [], [], []], // Initialize points cards taken for new game
    roundHistory: [], // Reset round history for new game
  };

  // Stay in passing phase
  return {
    ...newGameState,
    currentPlayerIndex: undefined,
    trickLeaderIndex: undefined,
    currentTrick: [],
    lastCompletedTrick: undefined,
    lastTrickWinnerIndex: undefined,
    heartsBroken: false,
  };
}
