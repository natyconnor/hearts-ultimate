/**
 * Lead Card Scoring for Hard AI
 *
 * Scores cards for the leading phase with memory-informed decisions.
 *
 * KEY INSIGHT: When leading, we want to AVOID winning the trick ourselves.
 * - If we lead low in a suit where opponents have high cards, THEY win (good!)
 * - If we lead hearts, we risk taking penalty points
 * - Prefer leading suits where we have low cards and opponents have high cards
 *
 * EXCEPTION: When shooting the moon, we WANT to win every trick!
 * - Lead high cards to guarantee wins
 * - Lead hearts to collect them all
 */

import type { Card, GameState } from "../../../../types/game";
import type { PlayContext, ScoredCard } from "../../types";
import { RANK, LEAD_SCORES, THRESHOLDS } from "../../types";
import { isQueenOfSpades, isHeart } from "../../../../game/rules";
import type { CardMemory } from "../../memory/cardMemory";

/**
 * Score all valid cards for leading
 */
export function scoreLeadCards(
  context: PlayContext,
  memory: CardMemory,
  moonShooterIndex: number | null,
  attemptingMoon: boolean = false
): ScoredCard[] {
  const { validCards, gameState, playerIndex } = context;

  return validCards.map((card) => {
    let score = LEAD_SCORES.BASE;
    const reasons: string[] = [];

    // === MOON SHOOTING MODE ===
    if (attemptingMoon) {
      return scoreMoonLeadCard(card, validCards, gameState, memory, reasons);
    }

    // === NORMAL MODE: prefer low cards (they're less likely to win) ===
    score -= card.rank * LEAD_SCORES.RANK_PENALTY_MULTIPLIER;

    // === HEARTS LEADING STRATEGY ===
    if (isHeart(card)) {
      scoreHeartLead(card, gameState, playerIndex, memory, reasons, (adj) => {
        score += adj;
      });
    }

    // === NON-HEART PENALTY CARDS (Q♠) ===
    if (isQueenOfSpades(card)) {
      score += LEAD_SCORES.NEVER_LEAD_QUEEN;
      reasons.push("Never lead Q♠!");
    }

    // === SPADE STRATEGY ===
    if (card.suit === "spades" && !isQueenOfSpades(card)) {
      scorepadeLead(card, validCards, memory, reasons, (adj) => {
        score += adj;
      });
    }

    // === MEMORY-BASED SUIT SELECTION ===
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

    // === SAFE LEAD BONUS ===
    if (card.suit === "clubs" || card.suit === "diamonds") {
      if (card.rank <= RANK.MID_RANGE_MIN) {
        score += LEAD_SCORES.SAFE_LOW_LEAD;
        reasons.push("Safe low lead");
      }
    }

    // === MOON PREVENTION ===
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
 * Score a card for leading when attempting to shoot the moon
 *
 * SNEAKY STRATEGY:
 * - Early game (tricks 1-5): Lead clubs/diamonds to exhaust opponents' high cards
 * - Don't lead Q♠ or hearts too early - it's obvious!
 * - Mid game: Start collecting hearts once control is established
 * - Late game: Mop up remaining points
 * - Lead from suits where you have DEPTH (multiple high cards)
 */
function scoreMoonLeadCard(
  card: Card,
  validCards: Card[],
  gameState: GameState,
  _memory: CardMemory,
  reasons: string[]
): ScoredCard {
  let score = LEAD_SCORES.BASE;

  const trickNumber = gameState.currentTrickNumber || 1;
  const isEarlyGame = trickNumber <= THRESHOLDS.MOON_EARLY_GAME_TRICKS;
  const isMidGame =
    trickNumber > THRESHOLDS.MOON_EARLY_GAME_TRICKS &&
    trickNumber <= THRESHOLDS.MOON_MID_GAME_TRICKS;
  const isLateGame = trickNumber > THRESHOLDS.MOON_MID_GAME_TRICKS;

  // === HEARTS STRATEGY ===
  if (isHeart(card)) {
    if (!gameState.heartsBroken) {
      score -= 200;
      reasons.push("Hearts not broken");
    } else if (isEarlyGame) {
      // Early game: Don't lead hearts yet - too obvious!
      score -= 30;
      reasons.push("Moon: too early for hearts");
    } else if (isMidGame) {
      // Mid game: Start collecting hearts, prefer high ones
      score += 20 + card.rank * 2;
      reasons.push("Moon: collect hearts");
    } else {
      // Late game: Aggressively collect remaining hearts
      score += 50 + card.rank * 3;
      reasons.push("Moon: sweep hearts!");
    }
  }

  // === Q♠ STRATEGY ===
  if (isQueenOfSpades(card)) {
    if (isEarlyGame) {
      // NEVER lead Q♠ early - dead giveaway!
      score -= 100;
      reasons.push("Moon: Q♠ too obvious early");
    } else if (isMidGame) {
      // Mid game: Okay if we need to
      score += 10;
      reasons.push("Moon: Q♠ acceptable now");
    } else {
      // Late game: Lead it to guarantee we get it
      score += 60;
      reasons.push("Moon: secure Q♠");
    }
  }

  // === CLUBS/DIAMONDS STRATEGY (Sneaky Setup) ===
  if (card.suit === "clubs" || card.suit === "diamonds") {
    if (isEarlyGame) {
      // Early game: GREAT for setup - exhaust opponents' high cards
      score += 40;
      reasons.push("Moon: sneaky setup lead");

      // Prefer leading from suits with depth (multiple high cards)
      const suitCards = validCards.filter((c) => c.suit === card.suit);
      const highCardsInSuit = suitCards.filter(
        (c) => c.rank >= RANK.QUEEN
      ).length;
      if (highCardsInSuit >= 2) {
        score += 25;
        reasons.push("Moon: can run this suit");
      }

      // Lead high cards to win and exhaust opponent high cards
      score += card.rank * 3;
    } else {
      // Later game: Still decent, lower priority than hearts
      score += 10 + card.rank;
    }
  }

  // === SPADES STRATEGY (Careful!) ===
  if (card.suit === "spades" && !isQueenOfSpades(card)) {
    if (isEarlyGame && card.rank >= RANK.KING) {
      // Don't lead A♠/K♠ early - might flush out Q♠ onto us before we want it
      score -= 20;
      reasons.push("Moon: careful with high spades early");
    } else if (isLateGame) {
      score += 20;
      reasons.push("Moon: spades okay late");
    }
  }

  // === GENERAL: Prefer suits with depth ===
  const suitCards = validCards.filter((c) => c.suit === card.suit);
  if (suitCards.length >= 4) {
    score += 15;
    reasons.push("Moon: long suit");
  }

  // === GENERAL: Prefer high cards (we need to win!) ===
  if (card.rank >= RANK.QUEEN) {
    score += 15;
    reasons.push("Moon: high card control");
  }

  return { card, score, reasons };
}

/**
 * Score heart leads based on game state and memory
 */
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

  // Hearts are broken - check for void opponents
  let opponentsVoid = 0;
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === playerIndex) continue;
    if (memory.isPlayerVoid(gameState.players[i].id, "hearts")) {
      opponentsVoid++;
    }
  }

  if (opponentsVoid > 0) {
    // Opponents void in hearts - whoever wins gets dumped on
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

/**
 * Score spade leads based on Q♠ status
 */
function scorepadeLead(
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

/**
 * Score based on memory of opponent cards
 */
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

    if (memory.mightHaveHighCards(playerId, card.suit)) {
      opponentsWithHighCards++;
    }

    if (memory.isPlayerVoid(playerId, card.suit)) {
      opponentsVoidInSuit++;
    }
  }

  // Opponents void = they'll dump penalty cards on whoever wins
  if (opponentsVoidInSuit > 0) {
    addScore(LEAD_SCORES.OPPONENT_VOID_MULTIPLIER * opponentsVoidInSuit);
    reasons.push(`${opponentsVoidInSuit} void in ${card.suit}`);
  }

  // Opponents with high cards = GOOD if we're leading LOW
  if (opponentsWithHighCards > 0 && card.rank <= RANK.MID_RANGE_MIN) {
    addScore(
      LEAD_SCORES.OPPONENT_HIGH_CARDS_MULTIPLIER * opponentsWithHighCards
    );
    reasons.push(`Opponents have high ${card.suit}`);
  }
}
