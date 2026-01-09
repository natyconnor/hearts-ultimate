/**
 * Follow Card Scoring for Hard AI
 *
 * Scores cards for the following phase with memory-informed decisions.
 *
 * When shooting the moon: ALWAYS try to win tricks and take penalty points!
 */

import type { Card } from "../../../../types/game";
import type { PlayContext, ScoredCard, AIConfig } from "../../types";
import { RANK, FOLLOW_SCORES } from "../../types";
import { isQueenOfSpades } from "../../../../game/rules";
import {
  getPenaltyPointsInTrick,
  getHighestRankInTrick,
  isLastToPlay,
} from "../../utils/trickAnalysis";
import type { CardMemory } from "../../memory/cardMemory";
import {
  shouldBluff,
  isQueenOfSpadesInTrick,
  getCurrentTrickWinner,
} from "./hardHelpers";

/**
 * Score cards for following suit
 */
export function scoreFollowCards(
  cardsOfSuit: Card[],
  context: PlayContext,
  memory: CardMemory,
  config: AIConfig,
  moonShooterIndex: number | null,
  attemptingMoon: boolean = false
): ScoredCard[] {
  const { currentTrickCards, leadSuit } = context;

  const currentHighest = getHighestRankInTrick(currentTrickCards, leadSuit!);
  const penaltyPoints = getPenaltyPointsInTrick(currentTrickCards);
  const lastToPlay = isLastToPlay(currentTrickCards.length);

  // Check if we are forced to win this trick (even our lowest legal card wins)
  const sortedCards = [...cardsOfSuit].sort((a, b) => a.rank - b.rank);
  const forcedToWin = sortedCards[0].rank > currentHighest;

  return cardsOfSuit.map((card) => {
    let score = FOLLOW_SCORES.BASE;
    const reasons: string[] = [];

    const wouldWin = card.rank > currentHighest;

    // === MOON SHOOTING MODE ===
    if (attemptingMoon) {
      return scoreMoonFollowCard(card, wouldWin, penaltyPoints, reasons);
    }

    // === NORMAL MODE ===

    // CRITICAL: Check if playing this card would give us penalty points
    if (wouldWin && isQueenOfSpades(card) && !context.isFirstTrick) {
      score +=
        FOLLOW_SCORES.WIN_WITH_POINTS_BASE +
        13 * FOLLOW_SCORES.PENALTY_POINTS_MULTIPLIER;
      reasons.push("Would win with Q♠ (13 pts!)");
      return { card, score, reasons };
    }

    // High spades (K♠, A♠) are dangerous when Q♠ is still out
    const queenAccountedFor =
      isQueenOfSpadesInTrick(currentTrickCards) ||
      memory.isQueenOfSpadesPlayed();

    if (
      wouldWin &&
      card.suit === "spades" &&
      card.rank > RANK.QUEEN &&
      !queenAccountedFor &&
      !context.isFirstTrick
    ) {
      score += FOLLOW_SCORES.RISK_OF_DUMP * 2;
      reasons.push("High spade risk - Q♠ still out");
    }

    if (wouldWin) {
      scoreWinningPlay(
        card,
        context,
        memory,
        config,
        penaltyPoints,
        lastToPlay,
        forcedToWin,
        moonShooterIndex,
        reasons,
        (adj) => {
          score += adj;
        }
      );
    } else {
      // Playing under - this is good!
      score += FOLLOW_SCORES.DUCK;
      reasons.push("Ducking");

      if (
        moonShooterIndex !== null &&
        moonShooterIndex !== context.playerIndex
      ) {
        // Someone is shooting - save HIGH cards to maintain control for stopping!
        // Play LOWEST card that still ducks
        score -= card.rank;
        reasons.push("Save high for moon defense");
      } else {
        // Normal play - play highest card that still ducks (save lowest for later)
        score += card.rank;
      }
    }

    return { card, score, reasons };
  });
}

/**
 * Score a card for following when attempting to shoot the moon
 * Strategy: WIN the trick if possible, especially if it has penalty points
 */
function scoreMoonFollowCard(
  card: Card,
  wouldWin: boolean,
  penaltyPoints: number,
  reasons: string[]
): ScoredCard {
  let score = FOLLOW_SCORES.BASE;

  if (wouldWin) {
    // Great! We can win this trick
    score += 50;
    reasons.push("Moon: win trick");

    // Even better if there are penalty points to collect
    if (penaltyPoints > 0) {
      score += penaltyPoints * 5;
      reasons.push(`Moon: collect ${penaltyPoints} pts`);
    }

    // Prefer playing the LOWEST card that still wins
    // (save high cards for later tricks)
    score -= card.rank * 2;
    reasons.push("Moon: win efficiently");
  } else {
    // We can't win - play lowest card to save high cards
    score -= card.rank * 3;
    reasons.push("Moon: can't win, save high cards");

    // If there are penalty points and we can't win, that's BAD
    // (someone else will take them and ruin our moon)
    if (penaltyPoints > 0) {
      score -= 30;
      reasons.push("Moon: risk of losing points");
    }
  }

  return { card, score, reasons };
}

/**
 * Score a play that would win the trick
 */
function scoreWinningPlay(
  card: Card,
  context: PlayContext,
  memory: CardMemory,
  config: AIConfig,
  penaltyPoints: number,
  lastToPlay: boolean,
  forcedToWin: boolean,
  moonShooterIndex: number | null,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  // FIRST TRICK IS ALWAYS SAFE - no penalty cards can be played
  if (context.isFirstTrick) {
    addScore(FOLLOW_SCORES.SAFE_WIN);
    reasons.push("Safe win (first trick)");
    addScore(card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER);
    return;
  }

  if (penaltyPoints > 0) {
    // Get current winner to check if non-shooter is already winning
    const currentWinnerIndex = getCurrentTrickWinner(
      context.currentTrickCards,
      context.gameState
    );
    scoreWinWithPenalties(
      card,
      penaltyPoints,
      forcedToWin,
      moonShooterIndex,
      context.playerIndex,
      currentWinnerIndex,
      reasons,
      addScore
    );
  } else if (lastToPlay) {
    // Last to play, no penalties - safe to win
    addScore(FOLLOW_SCORES.SAFE_WIN);
    reasons.push("Safe win as last player");
    addScore(card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER);
  } else {
    // Not first trick, not last player, no penalties yet - check for risk
    scoreRiskyWin(card, context, memory, forcedToWin, reasons, addScore);
  }

  // Bluffing - occasionally take safe tricks early
  if (shouldBluff(context, config) && penaltyPoints === 0 && lastToPlay) {
    addScore(FOLLOW_SCORES.BLUFF_TAKE_SAFE);
    reasons.push("Bluff - take safe trick");
  }
}

/**
 * Score winning a trick that has penalty points
 */
function scoreWinWithPenalties(
  card: Card,
  penaltyPoints: number,
  forcedToWin: boolean,
  moonShooterIndex: number | null,
  playerIndex: number,
  currentWinnerIndex: number | null,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  if (moonShooterIndex !== null && moonShooterIndex === playerIndex) {
    // We're trying to shoot - this is good!
    addScore(FOLLOW_SCORES.MOON_SHOT_TAKE);
    reasons.push("Moon shot - take penalties");
  } else if (moonShooterIndex !== null) {
    // Someone else is shooting - check if we NEED to stop them
    // If a non-shooter is already winning, we don't need to take it!
    const nonShooterWinning =
      currentWinnerIndex !== null && currentWinnerIndex !== moonShooterIndex;

    if (nonShooterWinning) {
      // Another non-shooter is winning - moon is already being stopped
      // Just duck and let them take it
      addScore(FOLLOW_SCORES.WIN_WITH_POINTS_BASE);
      reasons.push("Moon stopped by other player");
    } else {
      // Shooter is winning or would win - we need to stop them!
      addScore(FOLLOW_SCORES.STOP_MOON);
      reasons.push("Stop moon - take points");
    }
  } else {
    addScore(
      FOLLOW_SCORES.WIN_WITH_POINTS_BASE +
        penaltyPoints * FOLLOW_SCORES.PENALTY_POINTS_MULTIPLIER
    );
    if (forcedToWin) {
      addScore(card.rank);
      reasons.push("Forced win - dump highest");
    }
    reasons.push(`Would win ${penaltyPoints} pts`);
  }
}

/**
 * Score a potentially risky win (not last player, no penalties yet)
 */
function scoreRiskyWin(
  card: Card,
  context: PlayContext,
  memory: CardMemory,
  forcedToWin: boolean,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  const { playerIndex, gameState, leadSuit, currentTrickCards } = context;

  // Use memory to assess if remaining players might dump on us
  let voidPlayersAhead = 0;
  const playersAfterUs = 3 - currentTrickCards.length;

  for (let i = 1; i <= playersAfterUs; i++) {
    const nextPlayerIdx = (playerIndex + i) % 4;
    const nextPlayerId = gameState.players[nextPlayerIdx].id;
    if (memory.isPlayerVoid(nextPlayerId, leadSuit!)) {
      voidPlayersAhead++;
    }
  }

  const memoryStats = memory.getStats();
  const memoryReliable = memoryStats.tricksCounted >= 2;

  if (memoryReliable && voidPlayersAhead === 0) {
    // Memory says no one is void - relatively safe
    addScore(FOLLOW_SCORES.SAFE_WIN * 0.5);
    reasons.push("Likely safe (memory)");
    if (forcedToWin || card.rank > RANK.MID_RANGE_MAX) {
      addScore(card.rank);
      reasons.push("Dump high card");
    }
  } else if (voidPlayersAhead > 0) {
    // Known void players - high risk!
    addScore(FOLLOW_SCORES.RISK_OF_DUMP * 2);
    reasons.push("Known void player(s) ahead");
  } else {
    // Early game, memory sparse - moderate risk
    addScore(FOLLOW_SCORES.RISK_OF_DUMP);
    reasons.push("Risk of penalty dump");
  }
}
