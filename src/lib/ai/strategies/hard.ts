/**
 * Hard AI Strategy
 *
 * Advanced AI with all Medium features PLUS:
 * - Imperfect card counting with recency-biased memory
 * - Bluffing (taking safe early tricks to disguise hand)
 * - Moon shooting detection and prevention
 * - Leader targeting (give points to winning player)
 * - Advanced suit voiding strategy
 */

import type { Card, GameState } from "../../../types/game";
import type {
  AIStrategy,
  PlayContext,
  PassContext,
  ScoredCard,
  AIConfig,
} from "../types";
import {
  DEFAULT_AI_CONFIG,
  RANK,
  THRESHOLDS,
  PASS_SCORES,
  LEAD_SCORES,
  FOLLOW_SCORES,
  DUMP_SCORES,
} from "../types";
import { isQueenOfSpades, isHeart, isPenaltyCard } from "../../../game/rules";
import { scoreCardsForPassing } from "../utils/cardScoring";
import {
  getPenaltyPointsInTrick,
  getHighestRankInTrick,
  isLastToPlay,
} from "../utils/trickAnalysis";
import {
  getSuitDistribution,
  getVoidingPassCandidates,
} from "../utils/suitAnalysis";
import { CardMemory } from "../memory/cardMemory";
import { useAIDebugStore } from "../../../store/aiDebugStore";

export class HardStrategy implements AIStrategy {
  readonly difficulty = "hard" as const;
  private memory: CardMemory;
  private config: AIConfig;
  private playerIndexMap: Map<string, number> = new Map();

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.memory = new CardMemory(this.config.memoryTrickCount);
  }

  /**
   * Called when a new round starts
   */
  onRoundStart(): void {
    this.memory.reset();
    this.playerIndexMap.clear();
  }

  /**
   * Called when a trick completes - update memory
   */
  onTrickComplete(
    trick: Array<{ playerId: string; card: Card }>,
    _winnerIndex: number,
    _trickNumber: number
  ): void {
    if (trick.length === 0) return;

    const leadSuit = trick[0].card.suit;
    this.memory.recordTrick(trick, this.playerIndexMap, leadSuit);
  }

  /**
   * Choose 3 cards to pass
   * Strategy (all of Medium PLUS):
   * - Advanced voiding analysis
   * - Consider cards received in previous rounds (pattern detection)
   * - Strategic spade management
   */
  chooseCardsToPass(context: PassContext): Card[] {
    const { hand, gameState, playerIndex } = context;

    // Update player index map
    for (let i = 0; i < gameState.players.length; i++) {
      this.playerIndexMap.set(gameState.players[i].id, i);
    }

    // Get base scores
    const scoredCards = scoreCardsForPassing(hand, true);

    // Apply advanced passing analysis
    this.applyAdvancedPassScoring(scoredCards, hand, gameState, playerIndex);

    // Sort and return top 3
    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCards = scoredCards.slice(0, 3).map((sc) => sc.card);

    // Log decision
    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "hard",
      actionType: "pass",
      roundNumber: gameState.roundNumber,
      decision: chosenCards,
      consideredCards: scoredCards,
      contextInfo: `Passing ${gameState.passDirection}`,
    });

    return chosenCards;
  }

  /**
   * Apply advanced scoring adjustments for passing
   */
  private applyAdvancedPassScoring(
    scoredCards: ScoredCard[],
    hand: Card[],
    gameState: GameState,
    playerIndex: number
  ): void {
    const distribution = getSuitDistribution(hand);

    // Find best voiding opportunities
    const voidCandidates = getVoidingPassCandidates(hand);

    for (const scored of scoredCards) {
      const { card } = scored;

      // Boost void candidates (except spades with few low cards)
      if (
        voidCandidates.some((c) => c.suit === card.suit && c.rank === card.rank)
      ) {
        if (
          card.suit !== "spades" ||
          distribution.spades > THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION
        ) {
          scored.score += PASS_SCORES.VOID_OPPORTUNITY;
          scored.reasons?.push("Void opportunity");
        }
      }

      // Very protective of low spades
      if (card.suit === "spades" && card.rank < RANK.QUEEN) {
        const lowSpades = hand.filter(
          (c) => c.suit === "spades" && c.rank < RANK.QUEEN
        ).length;
        scored.score -=
          PASS_SCORES.SPADE_DEFENSE_MULTIPLIER *
          (THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION -
            Math.min(lowSpades, THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION));
        scored.reasons?.push("Critical spade defense");
      }

      // If we have 4+ cards in a suit with good low cards, high cards are safer
      if (
        distribution[card.suit] >= THRESHOLDS.PROTECTED_SUIT_SIZE &&
        card.rank >= RANK.HIGH_THRESHOLD
      ) {
        const lowCards = hand.filter(
          (c) => c.suit === card.suit && c.rank < RANK.MID_RANGE_MAX
        ).length;
        if (lowCards >= THRESHOLDS.MIN_LOW_CARDS_FOR_PROTECTION) {
          scored.score += PASS_SCORES.WELL_PROTECTED_HIGH;
          scored.reasons?.push("Well protected high card");
        }
      }

      // Consider game score - if we're winning, be more conservative
      const myScore = gameState.scores[playerIndex] ?? 0;
      const minOpponentScore = Math.min(
        ...gameState.scores.filter((_, i) => i !== playerIndex)
      );

      if (myScore < minOpponentScore - THRESHOLDS.WINNING_LEAD_MARGIN) {
        // We're winning by a lot - be more aggressive about getting rid of high cards
        if (card.rank >= RANK.QUEEN) {
          scored.score += PASS_SCORES.PROTECT_LEAD_DUMP_HIGH;
          scored.reasons?.push("Protect lead - dump high cards");
        }
      }
    }
  }

  /**
   * Choose a card to play
   * Strategy (all of Medium PLUS):
   * - Use card memory to inform decisions
   * - Bluffing on safe tricks
   * - Moon detection and prevention
   * - Leader targeting
   */
  chooseCardToPlay(context: PlayContext): Card {
    const {
      validCards,
      isLeading,
      leadSuit,
      isFirstTrick,
      gameState,
      playerIndex,
    } = context;

    // Update player map
    for (let i = 0; i < gameState.players.length; i++) {
      this.playerIndexMap.set(gameState.players[i].id, i);
    }

    // First trick - must play 2 of clubs if we have it
    if (isFirstTrick) {
      const twoOfClubs = validCards.find(
        (c) => c.suit === "clubs" && c.rank === 2
      );
      if (twoOfClubs) {
        useAIDebugStore.getState().addLog({
          playerId: gameState.players[playerIndex].id,
          playerName: gameState.players[playerIndex].name,
          difficulty: "hard",
          actionType: "play",
          roundNumber: gameState.roundNumber,
          decision: twoOfClubs,
          consideredCards: [
            { card: twoOfClubs, score: 1000, reasons: ["Must play 2♣"] },
          ],
          contextInfo: "First trick mandatory play",
        });
        return twoOfClubs;
      }
    }

    // Check for moon shooter and adjust strategy
    const moonShooterIndex = this.detectMoonShooter(gameState);

    let scoredCards: ScoredCard[];
    let contextInfo: string;

    if (isLeading) {
      scoredCards = this.chooseLeadCard(context, moonShooterIndex);
      contextInfo = "Leading";
    } else if (leadSuit) {
      const cardsOfSuit = validCards.filter((c) => c.suit === leadSuit);
      if (cardsOfSuit.length > 0) {
        scoredCards = this.chooseFollowCard(
          cardsOfSuit,
          context,
          moonShooterIndex
        );
        contextInfo = `Following ${leadSuit}`;
      } else {
        scoredCards = this.chooseDumpCard(
          validCards,
          context,
          moonShooterIndex
        );
        contextInfo = "Dumping (Void in suit)";
      }
    } else {
      // Should not happen if leadSuit is null (implies isLeading) but typescript check
      scoredCards = this.chooseDumpCard(validCards, context, moonShooterIndex);
      contextInfo = "Dumping";
    }

    // Select best card
    scoredCards.sort((a, b) => b.score - a.score);
    const chosenCard = scoredCards[0].card;

    // Log decision
    const memorySnapshot = this.memory.getSnapshot();
    useAIDebugStore.getState().addLog({
      playerId: gameState.players[playerIndex].id,
      playerName: gameState.players[playerIndex].name,
      difficulty: "hard",
      actionType: "play",
      roundNumber: gameState.roundNumber,
      decision: chosenCard,
      consideredCards: scoredCards,
      contextInfo,
      memorySnapshot: {
        ...memorySnapshot,
        moonShooterCandidate:
          moonShooterIndex !== null
            ? gameState.players[moonShooterIndex].name
            : null,
      },
    });

    return chosenCard;
  }

  /**
   * Detect if someone might be shooting the moon
   */
  private detectMoonShooter(gameState: GameState): number | null {
    const { roundScores, pointsCardsTaken } = gameState;

    // Check round scores - if someone has a lot of points and no one else has any
    for (let i = 0; i < roundScores.length; i++) {
      if (roundScores[i] >= this.config.moonDetectionThreshold) {
        // Check if they have all the points so far
        const otherScores = roundScores.filter((_, idx) => idx !== i);
        if (otherScores.every((s) => s === 0)) {
          return i; // Potential moon shooter
        }
      }
    }

    // Also check penalty cards taken
    if (pointsCardsTaken) {
      for (let i = 0; i < pointsCardsTaken.length; i++) {
        const hearts = pointsCardsTaken[i].filter((c) => isHeart(c)).length;
        const hasQueen = pointsCardsTaken[i].some(isQueenOfSpades);

        // If someone has 6+ hearts and Q♠ or 10+ hearts, they might be shooting
        if (
          (hearts >= THRESHOLDS.MOON_HEARTS_WITH_QUEEN && hasQueen) ||
          hearts >= THRESHOLDS.MOON_HEARTS_WITHOUT_QUEEN
        ) {
          const otherHearts = pointsCardsTaken
            .filter((_, idx) => idx !== i)
            .reduce(
              (sum, cards) => sum + cards.filter((c) => isHeart(c)).length,
              0
            );

          if (otherHearts === 0) {
            return i;
          }
        }
      }
    }

    return null;
  }

  /**
   * Choose which card to lead with
   */
  private chooseLeadCard(
    context: PlayContext,
    moonShooterIndex: number | null
  ): ScoredCard[] {
    const { validCards, gameState, playerIndex } = context;

    const scoredCards: ScoredCard[] = validCards.map((card) => {
      let score = LEAD_SCORES.BASE;
      const reasons: string[] = [];

      // Base scoring - prefer low cards
      score -= card.rank * LEAD_SCORES.RANK_PENALTY_MULTIPLIER;

      // Avoid leading hearts
      if (isHeart(card)) {
        if (!gameState.heartsBroken) {
          // Hard AI: Advanced memory analysis
          let opponentsVoid = false;
          for (let i = 0; i < gameState.players.length; i++) {
            if (i === playerIndex) continue;
            if (this.memory.isPlayerVoid(gameState.players[i].id, "hearts")) {
              opponentsVoid = true;
              break;
            }
          }

          // Check if my heart is effectively the lowest remaining
          let isLowest = true;
          for (let r = 2; r < card.rank; r++) {
            if (
              !this.memory.isCardPlayed({
                suit: "hearts",
                rank: r as Card["rank"],
              })
            ) {
              isLowest = false;
              break;
            }
          }

          if (opponentsVoid) {
            score += LEAD_SCORES.OPPONENT_VOID_HEARTS;
            reasons.push("Danger: Opponent void in hearts");
          } else if (isLowest) {
            score += LEAD_SCORES.SAFE_LOWEST_HEART;
            reasons.push("Safe lead: Lowest remaining heart");
          } else if (card.rank <= RANK.LOW_THRESHOLD) {
            score += LEAD_SCORES.STRATEGIC_LOW_HEART;
            reasons.push("Strategic low heart lead");
          } else {
            score += LEAD_SCORES.AVOID_HEARTS;
            reasons.push("Avoid leading hearts");
          }
        }
      }

      // Spade Strategy (Hard AI)
      if (
        card.suit === "spades" &&
        !this.memory.isQueenOfSpadesPlayed() &&
        !context.isFirstTrick
      ) {
        const holdsQueen = validCards.some(isQueenOfSpades);
        if (!holdsQueen && card.rank < RANK.QUEEN) {
          score += LEAD_SCORES.HARD_FISH_FOR_QUEEN;
          reasons.push("Fish for Q♠ (Memory confirmed out)");
        } else if (holdsQueen && card.rank < RANK.QUEEN) {
          score += LEAD_SCORES.HARD_PROTECT_OWNED_QUEEN;
          reasons.push("Protect owned Q♠");
        }
      }

      // Use memory - avoid leading suits where opponents might have high cards
      for (let i = 0; i < gameState.players.length; i++) {
        if (i === playerIndex) continue;
        const playerId = gameState.players[i].id;

        if (this.memory.mightHaveHighCards(playerId, card.suit)) {
          score += LEAD_SCORES.OPPONENT_MIGHT_HAVE_HIGH;
          reasons.push(`P${i} might have high ${card.suit}`);
        }

        if (this.memory.isPlayerVoid(playerId, card.suit)) {
          // They're void - they'll dump on us!
          score += LEAD_SCORES.OPPONENT_VOID_IN_SUIT;
          reasons.push(`P${i} void in ${card.suit}`);
        }
      }

      // Bluffing - occasionally lead higher card on "safe" suits
      if (
        this.shouldBluff(context) &&
        card.rank >= RANK.BLUFF_MIN &&
        card.rank <= RANK.QUEEN
      ) {
        const isSpades = card.suit === "spades";
        if (!isSpades && !isHeart(card)) {
          score += LEAD_SCORES.BLUFF_LEAD;
          reasons.push("Bluff lead");
        }
      }

      // Moon prevention - if someone is shooting, lead into them
      if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
        // Try to lead a suit they might not be able to win
        const shooterId = gameState.players[moonShooterIndex].id;
        if (this.memory.isPlayerVoid(shooterId, card.suit)) {
          // They're void - bad lead for us
          score += LEAD_SCORES.MOON_SHOOTER_VOID;
        } else {
          // They might have to follow and could lose
          score += LEAD_SCORES.MOON_PREVENTION;
          reasons.push("Moon prevention lead");
        }
      }

      // Leader targeting - if we're behind, try to give leader points
      const leaderIndex = this.findLeader(gameState);
      if (leaderIndex !== null && leaderIndex !== playerIndex) {
        // Try to lead cards that might give the leader points
        // This is tricky - we want hearts or Q♠ to end up with them
        if (isHeart(card) && gameState.heartsBroken) {
          score += LEAD_SCORES.TARGET_LEADER_HEARTS;
          reasons.push("Target leader with hearts");
        }
      }

      return { card, score, reasons };
    });

    return scoredCards;
  }

  /**
   * Choose which card to play when following suit
   */
  private chooseFollowCard(
    cardsOfSuit: Card[],
    context: PlayContext,
    moonShooterIndex: number | null
  ): ScoredCard[] {
    const { currentTrickCards, leadSuit, playerIndex, gameState } = context;

    const currentHighest = getHighestRankInTrick(currentTrickCards, leadSuit!);
    const penaltyPoints = getPenaltyPointsInTrick(currentTrickCards);
    const lastToPlay = isLastToPlay(currentTrickCards.length);

    // Check if we are forced to win this trick (even our lowest legal card wins)
    // or if we have the highest cards in the suit
    const myLegalCards = cardsOfSuit.sort((a, b) => a.rank - b.rank);
    const lowestWinningCard = myLegalCards.find((c) => c.rank > currentHighest);
    const forcedToWin =
      lowestWinningCard && myLegalCards[0].rank > currentHighest;

    const scoredCards: ScoredCard[] = cardsOfSuit.map((card) => {
      let score = FOLLOW_SCORES.BASE;
      const reasons: string[] = [];

      const wouldWin = card.rank > currentHighest;

      if (wouldWin) {
        if (penaltyPoints > 0 && !context.isFirstTrick) {
          // Would win with penalties - usually bad
          if (moonShooterIndex !== null && moonShooterIndex === playerIndex) {
            // We're trying to shoot - this is good!
            score += FOLLOW_SCORES.MOON_SHOT_TAKE;
            reasons.push("Moon shot - take penalties");
          } else if (moonShooterIndex !== null) {
            // Someone else is shooting - we might need to stop them
            score += FOLLOW_SCORES.STOP_MOON;
            reasons.push("Stop moon - take points");
          } else {
            score +=
              FOLLOW_SCORES.WIN_WITH_POINTS_BASE +
              penaltyPoints * FOLLOW_SCORES.PENALTY_POINTS_MULTIPLIER;
            // Only dump high if we are forced to win anyway
            if (forcedToWin) {
              score += card.rank;
              reasons.push("Forced win - dump highest");
            }
            reasons.push(`Would win ${penaltyPoints} pts`);
          }
        } else {
          // Trick is currently "safe" (no points yet) OR it's Trick 1 (always safe)
          const isSafe =
            context.isFirstTrick || (penaltyPoints === 0 && lastToPlay);

          // Check memory for danger if not last
          let memorySafe = true;
          if (!isSafe && penaltyPoints === 0) {
            // Check if remaining players are likely to dump points
            for (let i = 1; i <= 3 - currentTrickCards.length; i++) {
              const nextPlayerIdx = (playerIndex + i) % 4;
              const nextPlayerId = gameState.players[nextPlayerIdx].id;
              if (this.memory.isPlayerVoid(nextPlayerId, leadSuit!)) {
                memorySafe = false; // Danger of dumping
                break;
              }
            }
          }

          if (isSafe || (penaltyPoints === 0 && memorySafe)) {
            score += FOLLOW_SCORES.SAFE_WIN;
            reasons.push("Safe win");

            // Efficient winning: If we are winning, use the highest card to dump it
            // Especially if forced to win
            if (forcedToWin || card.rank > RANK.MID_RANGE_MAX) {
              score += card.rank * FOLLOW_SCORES.TRICK_1_RANK_MULTIPLIER;
              reasons.push("Dump high card while winning");
            }
          } else {
            score += FOLLOW_SCORES.RISK_OF_DUMP;
            // Only dump high if we are forced to win anyway
            if (forcedToWin) {
              score += card.rank;
              reasons.push("Forced win - dump highest");
            }
            reasons.push("Risk of dump");
          }
        }

        // Bluffing - occasionally take safe tricks early
        if (this.shouldBluff(context) && penaltyPoints === 0) {
          score += FOLLOW_SCORES.BLUFF_TAKE_SAFE;
          reasons.push("Bluff - take safe trick");
        }
      } else {
        // Playing under
        score += FOLLOW_SCORES.DUCK;
        reasons.push("Ducking");

        // Play highest safe card (save lowest for later)
        score += card.rank;
      }

      return { card, score, reasons };
    });

    return scoredCards;
  }

  /**
   * Choose which card to dump when can't follow suit
   */
  private chooseDumpCard(
    validCards: Card[],
    context: PlayContext,
    moonShooterIndex: number | null
  ): ScoredCard[] {
    const { gameState, playerIndex, currentTrickCards } = context;

    // Determine who is currently winning the trick
    const currentWinnerIndex = this.getCurrentTrickWinner(
      currentTrickCards,
      gameState
    );

    const scoredCards: ScoredCard[] = validCards.map((card) => {
      let score = DUMP_SCORES.BASE;
      const reasons: string[] = [];

      // Q♠ - highest priority dump (usually)
      if (isQueenOfSpades(card)) {
        if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
          // Don't dump Q♠ on moon shooter - it helps them!
          if (currentWinnerIndex === moonShooterIndex) {
            score += DUMP_SCORES.DONT_GIVE_QUEEN_TO_SHOOTER;
            reasons.push("Don't give Q♠ to moon shooter");
          } else {
            score += DUMP_SCORES.DUMP_ON_NON_SHOOTER;
            reasons.push("Dump Q♠ on non-shooter");
          }
        } else {
          score += DUMP_SCORES.QUEEN_OF_SPADES;
          reasons.push("Dump Q♠!");
        }
      }

      // Hearts
      if (isHeart(card)) {
        if (moonShooterIndex !== null && moonShooterIndex !== playerIndex) {
          if (currentWinnerIndex === moonShooterIndex) {
            score += DUMP_SCORES.DONT_GIVE_HEARTS_TO_SHOOTER;
            reasons.push("Don't give hearts to shooter");
          } else {
            score +=
              DUMP_SCORES.HEART_BASE +
              card.rank * DUMP_SCORES.HEART_RANK_MULTIPLIER;
            reasons.push("Dump heart on non-shooter");
          }
        } else {
          score +=
            DUMP_SCORES.HEART_BASE +
            card.rank * DUMP_SCORES.HEART_RANK_MULTIPLIER;
          reasons.push("Dump heart");
        }
      }

      // Leader targeting - dump points on the leader
      const leaderIndex = this.findLeader(gameState);
      if (leaderIndex !== null && currentWinnerIndex === leaderIndex) {
        if (isPenaltyCard(card)) {
          score += DUMP_SCORES.DUMP_ON_LEADER;
          reasons.push("Dump on leader");
        }
      }

      // Other high cards
      if (card.rank >= RANK.HIGH_THRESHOLD && !isPenaltyCard(card)) {
        score += card.rank * DUMP_SCORES.HIGH_CARD_RANK_MULTIPLIER;
        reasons.push("Dump high card");
      }

      // Keep low spades
      if (card.suit === "spades" && card.rank < RANK.QUEEN) {
        if (!this.memory.isQueenOfSpadesPlayed()) {
          score += DUMP_SCORES.HARD_KEEP_SPADE_QUEEN_OUT;
          reasons.push("Keep spade - Q♠ still out");
        } else {
          score += DUMP_SCORES.HARD_KEEP_LOW_SPADE;
          reasons.push("Keep low spade");
        }
      }

      return { card, score, reasons };
    });

    return scoredCards;
  }

  /**
   * Determine if we should consider bluffing
   */
  private shouldBluff(context: PlayContext): boolean {
    // Random chance based on config
    if (Math.random() > this.config.bluffProbability) {
      return false;
    }

    // Don't bluff on first trick
    if (context.isFirstTrick) return false;

    // Don't bluff late in round
    if (context.tricksPlayedThisRound >= THRESHOLDS.LATE_GAME_TRICKS)
      return false;

    // Don't bluff if there are penalties in the trick
    if (getPenaltyPointsInTrick(context.currentTrickCards) > 0) return false;

    return true;
  }

  /**
   * Find the player who is currently in the lead (lowest score)
   * Returns null if scores are close
   */
  private findLeader(gameState: GameState): number | null {
    const { scores } = gameState;
    const minScore = Math.min(...scores);
    const leaderIndex = scores.indexOf(minScore);

    // Check if there's a significant lead
    const sortedScores = [...scores].sort((a, b) => a - b);
    if (sortedScores.length >= 2) {
      const leadAmount = sortedScores[1] - sortedScores[0];
      if (leadAmount >= this.config.leaderPointThreshold) {
        return leaderIndex;
      }
    }

    return null;
  }

  /**
   * Get the index of the player currently winning the trick
   */
  private getCurrentTrickWinner(
    trick: Array<{ playerId: string; card: Card }>,
    gameState: GameState
  ): number | null {
    if (trick.length === 0) return null;

    const leadSuit = trick[0].card.suit;
    let winningPlay = trick[0];

    for (const play of trick) {
      if (
        play.card.suit === leadSuit &&
        play.card.rank > winningPlay.card.rank
      ) {
        winningPlay = play;
      }
    }

    return gameState.players.findIndex((p) => p.id === winningPlay.playerId);
  }
}
