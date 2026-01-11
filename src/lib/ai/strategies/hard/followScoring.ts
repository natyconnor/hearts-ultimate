/**
 * Follow Card Scoring
 *
 * Normal: avoid winning tricks with penalty points, duck when possible.
 * Moon shooting: try to win every trick, especially those with penalties.
 */

import type { Card } from "../../../../types/game";
import type {
  PlayContext,
  ScoredCard,
  AIConfig,
  AggressivenessModifiers,
} from "../../types";
import { RANK, FOLLOW_SCORES } from "../../constants";
import { isQueenOfSpades } from "../../../../game/rules";
import {
  getPenaltyPointsInTrick,
  getHighestRankInTrick,
  isLastToPlay,
  isQueenOfSpadesInTrick,
} from "../../utils/trickAnalysis";
import type { CardMemory } from "../../memory/cardMemory";
import { shouldBluff, getCurrentTrickWinner } from "./hardHelpers";

export function scoreFollowCards(
  cardsOfSuit: Card[],
  context: PlayContext,
  memory: CardMemory,
  config: AIConfig,
  moonShooterIndex: number | null,
  attemptingMoon = false,
  modifiers?: AggressivenessModifiers
): ScoredCard[] {
  const { currentTrickCards, leadSuit } = context;

  const currentHighest = getHighestRankInTrick(currentTrickCards, leadSuit!);
  const penaltyPoints = getPenaltyPointsInTrick(currentTrickCards);
  const lastToPlay = isLastToPlay(currentTrickCards.length);

  const sortedCards = [...cardsOfSuit].sort((a, b) => a.rank - b.rank);
  const forcedToWin = sortedCards[0].rank > currentHighest;

  // Apply aggressiveness modifiers (default to neutral if not provided)
  const duckMultiplier = modifiers?.duckPreferenceMultiplier ?? 1;
  const riskMultiplier = modifiers?.riskToleranceMultiplier ?? 1;

  return cardsOfSuit.map((card) => {
    const wouldWin = card.rank > currentHighest;

    if (attemptingMoon) {
      return scoreMoonFollow(card, wouldWin, penaltyPoints);
    }

    let score = FOLLOW_SCORES.BASE;
    const reasons: string[] = [];

    // Critical: playing Q♠ and winning
    if (wouldWin && isQueenOfSpades(card) && !context.isFirstTrick) {
      score +=
        FOLLOW_SCORES.WIN_WITH_POINTS_BASE +
        13 * FOLLOW_SCORES.PENALTY_POINTS_MULTIPLIER;
      reasons.push("Would win with Q♠ (13 pts!)");
      return { card, score, reasons };
    }

    // High spades risky when Q♠ still out (apply risk multiplier)
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
      score += FOLLOW_SCORES.RISK_OF_DUMP * 2 * riskMultiplier;
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
        },
        riskMultiplier,
        modifiers?.bluffProbability
      );
    } else {
      // Apply duck preference multiplier - more aggressive = lower duck preference
      score += FOLLOW_SCORES.DUCK * duckMultiplier;
      reasons.push("Ducking");

      // When stopping moon: save high cards. Otherwise: play highest that still ducks.
      if (
        moonShooterIndex !== null &&
        moonShooterIndex !== context.playerIndex
      ) {
        score -= card.rank;
        reasons.push("Save high for moon defense");
      } else {
        score += card.rank;
      }
    }

    return { card, score, reasons };
  });
}

function scoreMoonFollow(
  card: Card,
  wouldWin: boolean,
  penaltyPoints: number
): ScoredCard {
  let score = FOLLOW_SCORES.BASE;
  const reasons: string[] = [];

  if (wouldWin) {
    score += 50;
    reasons.push("Moon: win trick");

    if (penaltyPoints > 0) {
      score += penaltyPoints * 5;
      reasons.push(`Moon: collect ${penaltyPoints} pts`);
    }

    // Win efficiently (lowest winning card)
    score -= card.rank * 2;
    reasons.push("Moon: win efficiently");
  } else {
    // Can't win - save high cards
    score -= card.rank * 3;
    reasons.push("Moon: can't win, save high cards");

    if (penaltyPoints > 0) {
      score -= 30;
      reasons.push("Moon: risk of losing points");
    }
  }

  return { card, score, reasons };
}

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
  addScore: (adj: number) => void,
  riskMultiplier: number = 1,
  bluffProbability?: number
): void {
  // First trick is always safe
  if (context.isFirstTrick) {
    addScore(FOLLOW_SCORES.SAFE_WIN);
    reasons.push("Safe win (first trick)");
    addScore(card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER);
    return;
  }

  if (penaltyPoints > 0) {
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
    addScore(FOLLOW_SCORES.SAFE_WIN);
    reasons.push("Safe win as last player");
    addScore(card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER);
  } else {
    scoreRiskyWin(card, context, memory, forcedToWin, reasons, addScore, riskMultiplier);
  }

  // Bluffing - use aggressiveness-adjusted probability if provided
  const effectiveBluffProb = bluffProbability ?? config.bluffProbability;
  const configForBluff = { ...config, bluffProbability: effectiveBluffProb };
  if (shouldBluff(context, configForBluff) && penaltyPoints === 0 && lastToPlay) {
    addScore(FOLLOW_SCORES.BLUFF_TAKE_SAFE);
    reasons.push("Bluff - take safe trick");
  }
}

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
    // We're shooting - take penalties
    addScore(FOLLOW_SCORES.MOON_SHOT_TAKE);
    reasons.push("Moon shot - take penalties");
  } else if (moonShooterIndex !== null) {
    // Someone else shooting - check if we need to stop them
    const nonShooterWinning =
      currentWinnerIndex !== null && currentWinnerIndex !== moonShooterIndex;

    if (nonShooterWinning) {
      addScore(FOLLOW_SCORES.WIN_WITH_POINTS_BASE);
      reasons.push("Moon stopped by other player");
    } else {
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

function scoreRiskyWin(
  card: Card,
  context: PlayContext,
  memory: CardMemory,
  forcedToWin: boolean,
  reasons: string[],
  addScore: (adj: number) => void,
  riskMultiplier: number = 1
): void {
  const { gameState, leadSuit, currentTrickCards } = context;

  // Check which players haven't played yet by looking at who's in the trick
  const playersWhoPlayed = new Set(currentTrickCards.map((c) => c.playerId));
  const ourPlayerId = gameState.players[context.playerIndex].id;

  // Find players who haven't played yet (excluding us)
  const playersAfterUs = gameState.players.filter(
    (p) => p.id !== ourPlayerId && !playersWhoPlayed.has(p.id)
  );

  // Check how many of them are known void in the lead suit
  let voidPlayersAhead = 0;
  for (const player of playersAfterUs) {
    if (memory.isPlayerVoid(player.id, leadSuit!)) {
      voidPlayersAhead++;
    }
  }

  // Known void = NEVER safe. Don't even consider "likely safe".
  // Apply risk multiplier - aggressive AI takes this penalty less seriously
  if (voidPlayersAhead > 0) {
    addScore(FOLLOW_SCORES.RISK_OF_DUMP * 3 * riskMultiplier);
    reasons.push("Known void player(s) ahead - DUCK!");
    return;
  }

  const memoryStats = memory.getStats();
  const memoryReliable = memoryStats.tricksCounted >= 2;

  if (memoryReliable) {
    // No known voids and memory is reliable - probably safe
    addScore(FOLLOW_SCORES.SAFE_WIN * 0.5);
    reasons.push("Likely safe (memory)");
    if (forcedToWin || card.rank > RANK.MID_RANGE_MAX) {
      addScore(card.rank);
      reasons.push("Dump high card");
    }
  } else {
    // Early game, no info yet - slight risk (apply risk multiplier)
    addScore(FOLLOW_SCORES.RISK_OF_DUMP * riskMultiplier);
    reasons.push("Risk of penalty dump");
  }
}
