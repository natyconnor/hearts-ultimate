import type { Card, GameState } from "../types/game";
import {
  canPlayCard,
  getTrickWinner,
  calculateTrickPoints,
  shouldBreakHearts,
  isRoundComplete,
  checkShootingTheMoon,
  applyShootingTheMoon,
  getNextPlayerIndex,
  findPlayerWithTwoOfClubs,
  isFirstTrick,
} from "./rules";
import { getPassDirection } from "./passingLogic";
import { cardsEqual } from "./cardDisplay";

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

  let finalGameState: GameState = {
    ...gameState,
    players: updatedPlayers,
    hands: updatedHands,
    currentTrick: updatedTrick,
    heartsBroken: newHeartsBroken,
  };

  if (trickComplete) {
    // Determine trick winner
    const winnerIndex = getTrickWinner(updatedTrick);
    const winnerPlayerId = updatedTrick[winnerIndex].playerId;
    const winnerPlayerIndex = updatedPlayers.findIndex(
      (p) => p.id === winnerPlayerId
    );

    // Calculate points for this trick
    const trickPoints = calculateTrickPoints(updatedTrick);

    // Update round scores
    const updatedRoundScores = [...gameState.roundScores];
    Object.entries(trickPoints).forEach(([pid, points]) => {
      const pIndex = updatedPlayers.findIndex((p) => p.id === pid);
        updatedRoundScores[pIndex] += points;
    });

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

      // Check if game is over (someone has 100+ points)
      const gameOver = updatedScores.some((score) => score >= 100);

      // Find game winner (player with lowest score)
      let gameWinnerIndex: number | undefined;
      if (gameOver) {
        const minScore = Math.min(...updatedScores);
        gameWinnerIndex = updatedScores.findIndex(
          (score) => score === minScore
        );
      }

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
 * Completes the reveal phase and starts play
 * Called when player clicks "Ready to Play" after seeing received cards
 */
export function completeRevealPhase(gameState: GameState): GameState {
  return initializeRound({
    ...gameState,
    isRevealPhase: false,
    receivedCards: undefined,
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
    isRoundComplete: false,
    isGameOver: false,
    winnerIndex: undefined,
    passDirection,
    isPassingPhase: passDirection !== "none",
    passSubmissions: passDirection !== "none" ? [] : undefined,
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
