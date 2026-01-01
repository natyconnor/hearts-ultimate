import type { Card, GameState, Player } from "../types/game";
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
  const updatedHand = player.hand.filter(
    (c) => !(c.suit === card.suit && c.rank === card.rank)
  );

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
  const updatedTrick = [
    ...gameState.currentTrick,
    { playerId, card },
  ];

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
      if (pIndex !== -1) {
        updatedRoundScores[pIndex] += points;
      }
    });

    // Check if round is complete
    const roundComplete = isRoundComplete({
      ...finalGameState,
      players: updatedPlayers,
    });

    if (roundComplete) {
      // Check for shooting the moon
      const moonCheck = checkShootingTheMoon(updatedRoundScores);
      let finalRoundScores = updatedRoundScores;
      if (moonCheck.shot && moonCheck.playerIndex !== undefined) {
        finalRoundScores = applyShootingTheMoon(
          updatedRoundScores,
          moonCheck.playerIndex
        );
      }

      // Update cumulative scores
      const updatedScores = gameState.scores.map(
        (score, index) => score + finalRoundScores[index]
      );

      // Check if game is over (someone has 100+ points)
      const gameOver = updatedScores.some((score) => score >= 100);

      finalGameState = {
        ...finalGameState,
        currentTrick: [],
        lastCompletedTrick: updatedTrick,
        lastTrickWinnerIndex: winnerPlayerIndex,
        roundScores: finalRoundScores,
        scores: updatedScores,
        currentPlayerIndex: undefined,
        trickLeaderIndex: undefined,
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
  };
}

