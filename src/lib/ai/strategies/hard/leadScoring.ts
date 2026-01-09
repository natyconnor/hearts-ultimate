/**
 * Lead Card Scoring
 *
 * When leading normally: prefer low cards so opponents win the trick.
 * When shooting moon: lead high to guarantee wins.
 */

import type { Card, GameState } from "../../../../types/game";
import type { PlayContext, ScoredCard } from "../../types";
import { RANK, LEAD_SCORES, THRESHOLDS } from "../../constants";
import { isQueenOfSpades, isHeart } from "../../../../game/rules";
import type { CardMemory } from "../../memory/cardMemory";

export function scoreLeadCards(
  context: PlayContext,
  memory: CardMemory,
  moonShooterIndex: number | null,
  attemptingMoon = false
): ScoredCard[] {
  const { validCards, gameState, playerIndex } = context;

  return validCards.map((card) => {
    if (attemptingMoon) {
      return scoreMoonLead(card, validCards, gameState, memory);
    }

    let score = LEAD_SCORES.BASE;
    const reasons: string[] = [];

    // Prefer low cards (less likely to win)
    score -= card.rank * LEAD_SCORES.RANK_PENALTY_MULTIPLIER;

    if (isHeart(card)) {
      scoreHeartLead(card, gameState, playerIndex, memory, reasons, (adj) => {
        score += adj;
      });
    }

    if (isQueenOfSpades(card)) {
      score += LEAD_SCORES.NEVER_LEAD_QUEEN;
      reasons.push("Never lead Q♠!");
    }

    if (card.suit === "spades" && !isQueenOfSpades(card)) {
      scoreSpadeLead(card, validCards, memory, reasons, (adj) => {
        score += adj;
      });
    }

    scoreMemoryBasedLead(
      card,
      gameState,
      playerIndex,
      memory,
      reasons,
      (adj) => {
        score += adj;
      }
    );

    // Safe low lead bonus
    if (
      (card.suit === "clubs" || card.suit === "diamonds") &&
      card.rank <= RANK.MID_RANGE_MIN
    ) {
      score += LEAD_SCORES.SAFE_LOW_LEAD;
      reasons.push("Safe low lead");
    }

    // Moon prevention
    if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
      const shooterId = gameState.players[moonShooterIndex].id;
      if (memory.isPlayerVoid(shooterId, card.suit)) {
        score += LEAD_SCORES.MOON_SHOOTER_VOID;
        reasons.push("Shooter void - bad lead");
      } else {
        score += LEAD_SCORES.MOON_PREVENTION;
        reasons.push("Moon prevention");
      }
    }

    return { card, score, reasons };
  });
}

/**
 * Score for leading when shooting the moon
 *
 * Early game: Lead clubs/diamonds to exhaust opponents' high cards (sneaky)
 * Mid game: Start collecting hearts
 * Late game: Sweep remaining points
 */
function scoreMoonLead(
  card: Card,
  validCards: Card[],
  gameState: GameState,
  _memory: CardMemory
): ScoredCard {
  let score = LEAD_SCORES.BASE;
  const reasons: string[] = [];

  const trickNumber = gameState.currentTrickNumber || 1;
  const isEarlyGame = trickNumber <= THRESHOLDS.MOON_EARLY_GAME_TRICKS;
  const isMidGame =
    trickNumber > THRESHOLDS.MOON_EARLY_GAME_TRICKS &&
    trickNumber <= THRESHOLDS.MOON_MID_GAME_TRICKS;
  const isLateGame = trickNumber > THRESHOLDS.MOON_MID_GAME_TRICKS;

  if (isHeart(card)) {
    if (!gameState.heartsBroken) {
      score -= 200;
      reasons.push("Hearts not broken");
    } else if (isEarlyGame) {
      score -= 30;
      reasons.push("Moon: too early for hearts");
    } else if (isMidGame) {
      score += 20 + card.rank * 2;
      reasons.push("Moon: collect hearts");
    } else {
      score += 50 + card.rank * 3;
      reasons.push("Moon: sweep hearts!");
    }
  }

  if (isQueenOfSpades(card)) {
    if (isEarlyGame) {
      score -= 100;
      reasons.push("Moon: Q♠ too obvious early");
    } else if (isMidGame) {
      score += 10;
      reasons.push("Moon: Q♠ acceptable now");
    } else {
      score += 60;
      reasons.push("Moon: secure Q♠");
    }
  }

  if (card.suit === "clubs" || card.suit === "diamonds") {
    if (isEarlyGame) {
      score += 40;
      reasons.push("Moon: sneaky setup lead");

      const suitCards = validCards.filter((c) => c.suit === card.suit);
      const highCardsInSuit = suitCards.filter(
        (c) => c.rank >= RANK.QUEEN
      ).length;
      if (highCardsInSuit >= 2) {
        score += 25;
        reasons.push("Moon: can run this suit");
      }
      score += card.rank * 3;
    } else {
      score += 10 + card.rank;
    }
  }

  if (card.suit === "spades" && !isQueenOfSpades(card)) {
    if (isEarlyGame && card.rank >= RANK.KING) {
      score -= 20;
      reasons.push("Moon: careful with high spades early");
    } else if (isLateGame) {
      score += 20;
      reasons.push("Moon: spades okay late");
    }
  }

  // Prefer suits with depth
  const suitCards = validCards.filter((c) => c.suit === card.suit);
  if (suitCards.length >= 4) {
    score += 15;
    reasons.push("Moon: long suit");
  }

  if (card.rank >= RANK.QUEEN) {
    score += 15;
    reasons.push("Moon: high card control");
  }

  return { card, score, reasons };
}

function scoreHeartLead(
  card: Card,
  gameState: GameState,
  playerIndex: number,
  memory: CardMemory,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  if (!gameState.heartsBroken) {
    addScore(LEAD_SCORES.HEARTS_NOT_BROKEN);
    reasons.push("Hearts not broken!");
    return;
  }

  let opponentsVoid = 0;
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    if (memory.isPlayerVoid(gameState.players[i].id, "hearts")) {
      opponentsVoid++;
    }
  }

  if (opponentsVoid > 0) {
    if (card.rank <= 5) {
      addScore(LEAD_SCORES.LOW_HEART_VOID_OPPONENTS);
      reasons.push("Low heart - opponents dump on winner");
    } else {
      addScore(LEAD_SCORES.HIGH_HEART_VOID_RISK);
      reasons.push("Risky - opponents void in hearts");
    }
  } else if (card.rank <= 5) {
    addScore(LEAD_SCORES.LOW_HEART_LEAD);
    reasons.push("Low heart lead");
  } else if (card.rank >= RANK.HIGH_THRESHOLD) {
    addScore(LEAD_SCORES.HIGH_HEART_RISK);
    reasons.push("High heart - might win");
  } else {
    addScore(LEAD_SCORES.MID_HEART);
    reasons.push("Mid heart");
  }
}

function scoreSpadeLead(
  card: Card,
  validCards: Card[],
  memory: CardMemory,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  const holdsQueen = validCards.some(isQueenOfSpades);
  const queenPlayed = memory.isQueenOfSpadesPlayed();

  if (!holdsQueen && card.rank < RANK.QUEEN && !queenPlayed) {
    addScore(LEAD_SCORES.HARD_FISH_FOR_QUEEN);
    reasons.push("Fish for Q♠");
  } else if (queenPlayed) {
    addScore(LEAD_SCORES.EARLY_SAFE_LEAD);
    reasons.push("Safe spade (Q♠ gone)");
  } else if (holdsQueen && card.rank < RANK.QUEEN) {
    addScore(LEAD_SCORES.SAVE_SPADE_FOR_QUEEN);
    reasons.push("Save spade to protect Q♠");
  }

  if (card.rank > RANK.QUEEN && !queenPlayed) {
    addScore(LEAD_SCORES.HIGH_SPADE_CATCH_QUEEN);
    reasons.push("High spade - might catch Q♠");
  }
}

function scoreMemoryBasedLead(
  card: Card,
  gameState: GameState,
  playerIndex: number,
  memory: CardMemory,
  reasons: string[],
  addScore: (adj: number) => void
): void {
  let opponentsWithHighCards = 0;
  let opponentsVoidInSuit = 0;

  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    const playerId = gameState.players[i].id;

    if (memory.mightHaveHighCards(playerId, card.suit))
      opponentsWithHighCards++;
    if (memory.isPlayerVoid(playerId, card.suit)) opponentsVoidInSuit++;
  }

  if (opponentsVoidInSuit > 0) {
    addScore(LEAD_SCORES.OPPONENT_VOID_MULTIPLIER * opponentsVoidInSuit);
    reasons.push(`${opponentsVoidInSuit} void in ${card.suit}`);
  }

  // Opponents with high cards = good if we're leading low
  if (opponentsWithHighCards > 0 && card.rank <= RANK.MID_RANGE_MIN) {
    addScore(
      LEAD_SCORES.OPPONENT_HIGH_CARDS_MULTIPLIER * opponentsWithHighCards
    );
    reasons.push(`Opponents have high ${card.suit}`);
  }
}
