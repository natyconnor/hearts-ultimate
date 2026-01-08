import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Home } from "lucide-react";
import { cn } from "../lib/utils";
import {
  getRoomBySlug,
  updateRoomGameState,
  updateRoomStatus,
} from "../lib/roomApi";
import { useGameRealtime } from "../hooks/useGameRealtime";
import { useRoomSync } from "../hooks/useRoomSync";
import { useRoomNavigationBlocker } from "../hooks/useRoomNavigationBlocker";
import { usePageUnloadWarning } from "../hooks/usePageUnloadWarning";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS } from "../lib/constants";
import { createAIPlayersToFillSlots } from "../lib/aiPlayers";
import { chooseAICard, chooseAICardsToPass } from "../lib/ai";
import { createAndDeal } from "../game/deck";
import {
  prepareNewRound,
  resetGameForNewGame,
  startRoundWithPassingPhase,
  completeRevealPhase,
  finalizePassingPhase,
} from "../game/gameLogic";
import {
  submitPassSelection,
  executePassPhase,
  allPlayersHavePassed,
  hasPlayerSubmittedPass,
  processAIPassesAndFinalize,
} from "../game/passingLogic";
import { checkShootingTheMoon } from "../game/rules";
import { cardsEqual } from "../game/cardDisplay";
import { GameTable } from "../components/GameTable";
import { GameEndOverlay } from "../components/GameEndOverlay";
import { RoundSummaryOverlay } from "../components/RoundSummaryOverlay";
import { PassingPhaseOverlay } from "../components/PassingPhaseOverlay";
import { ReceivedCardsOverlay } from "../components/ReceivedCardsOverlay";
import { AIDebugOverlay } from "../components/AIDebugOverlay";
import { playSound } from "../lib/sounds";
import type {
  GameState,
  Player,
  Card as CardType,
  AIDifficulty,
} from "../types/game";

export function GameRoom() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    gameState,
    currentRoom,
    setCurrentRoom,
    updateGameState,
    clearCurrentRoom,
  } = useGameStore();

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.PLAYER_ID)
  );
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showCompletedTrick, setShowCompletedTrick] = useState(false);
  const [animatingToWinner, setAnimatingToWinner] = useState(false);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [selectedCardsToPass, setSelectedCardsToPass] = useState<CardType[]>(
    []
  );
  const cardHandRef = useRef<HTMLDivElement>(null);
  // Use refs for animation state to avoid closure issues in useEffect
  const isAnimatingRef = useRef(false);
  const showRoundSummaryRef = useRef(false);
  const showGameEndRef = useRef(false);

  const { isConnected, error: realtimeError } = useGameRealtime(slug ?? null);

  const {
    data: room,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["room", slug],
    queryFn: () => {
      if (!slug) throw new Error("No slug provided");
      return getRoomBySlug(slug);
    },
    enabled: !!slug,
  });

  useRoomSync(room, slug);

  useEffect(() => {
    return () => {
      const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      if (!storedPlayerId) {
        clearCurrentRoom();
      }
    };
  }, [clearCurrentRoom]);

  const currentGameState = gameState ?? room?.gameState ?? null;
  const players = currentGameState?.players ?? [];
  const roomStatus = currentRoom.status ?? room?.status ?? "waiting";

  const currentPlayer = currentPlayerId
    ? players.find((p) => p.id === currentPlayerId) ?? null
    : null;
  const isPlayerInRoom = !!currentPlayer;

  useRoomNavigationBlocker({
    slug: slug ?? null,
    isPlayerInRoom,
    roomStatus,
    currentPlayerId,
    currentGameState,
  });

  usePageUnloadWarning({
    isPlayerInRoom,
    roomStatus,
    enabled: !!(slug && room && currentPlayerId),
  });

  const joinRoomMutation = useMutation({
    mutationFn: async (playerName: string) => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;

      if (room.status !== "waiting")
        throw new Error("Room is not accepting players");
      if (currentGameState.players.length >= 4) throw new Error("Room is full");

      const existingPlayer = currentGameState.players.find(
        (p) => p.id === currentPlayerId
      );
      if (existingPlayer) {
        throw new Error("You are already in this room");
      }

      const playerId = `player-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isAI: false,
        hand: [],
        score: 0,
      };

      const updatedGameState: GameState = {
        ...currentGameState,
        players: [...currentGameState.players, newPlayer],
      };

      await updateRoomGameState(slug, updatedGameState);

      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, playerId);
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, playerName);
      setCurrentPlayerId(playerId);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const addAIPlayersMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "waiting")
        throw new Error("Cannot add AI players after game started");
      if (currentGameState.players.length >= 4)
        throw new Error("Room is already full");

      // Get AI difficulty from localStorage
      const storedDifficulty = localStorage.getItem(
        STORAGE_KEYS.AI_DIFFICULTY
      ) as AIDifficulty | null;
      const difficulty: AIDifficulty = storedDifficulty || "easy";

      const newAIPlayers = createAIPlayersToFillSlots(
        currentGameState.players,
        difficulty
      );
      const updatedGameState: GameState = {
        ...currentGameState,
        players: [...currentGameState.players, ...newAIPlayers],
      };

      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "waiting") throw new Error("Game has already started");
      if (currentGameState.players.length !== 4)
        throw new Error("Need 4 players to start");

      // Deal cards to all 4 players
      const hands = createAndDeal();

      // Set up initial game state
      let updatedGameState: GameState = {
        ...currentGameState,
        roundScores: [0, 0, 0, 0],
        roundNumber: 1,
        isRoundComplete: false,
        isGameOver: false,
        winnerIndex: undefined,
      };

      // Start round with passing phase (or play if direction is "none")
      updatedGameState = startRoundWithPassingPhase(updatedGameState, hands);

      // Process AI passes immediately (they don't need to "think")
      if (updatedGameState.isPassingPhase) {
        updatedGameState = processAIPassesAndFinalize(
          updatedGameState,
          chooseAICardsToPass,
          finalizePassingPhase
        );
      }

      // Update game state with dealt cards, then update status
      await updateRoomGameState(slug, updatedGameState);
      await updateRoomStatus(slug, "playing");

      setCurrentRoom({
        roomId: room.id,
        slug: room.slug,
        status: "playing",
      });

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setSelectedCardsToPass([]); // Reset pass selection
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room || !currentPlayerId) throw new Error("Not in room");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      const updatedPlayers = currentGameState.players.filter(
        (p) => p.id !== currentPlayerId
      );

      const updatedGameState: GameState = {
        ...currentGameState,
        players: updatedPlayers,
      };

      if (roomStatus === "playing") {
        await updateRoomStatus(slug, "finished");
      }

      await updateRoomGameState(slug, updatedGameState);

      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
      setCurrentPlayerId(null);

      return { updatedGameState, endedGame: roomStatus === "playing" };
    },
    onSuccess: (result) => {
      updateGameState(result.updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
      if (result.endedGame) {
        alert("A player left the game. The game has ended.");
      }
      navigate("/");
    },
  });

  // Start next round mutation
  const nextRoundMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;

      // Deal new cards
      const newHands = createAndDeal();

      // Prepare the new round with dealt cards
      let updatedGameState = prepareNewRound(currentGameState, newHands);

      // Process AI passes immediately if in passing phase
      if (updatedGameState.isPassingPhase) {
        updatedGameState = processAIPassesAndFinalize(
          updatedGameState,
          chooseAICardsToPass,
          finalizePassingPhase
        );
      }

      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setShowRoundSummary(false);
      showRoundSummaryRef.current = false;
      setSelectedCardsToPass([]); // Reset pass selection for new round
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  // Submit pass selection mutation
  const submitPassMutation = useMutation({
    mutationFn: async (cards: CardType[]) => {
      if (!slug || !room || !currentPlayerId) throw new Error("Not in room");
      const currentGameState = gameState ?? room.gameState;

      // Submit this player's pass selection
      const result = submitPassSelection(
        currentGameState,
        currentPlayerId,
        cards
      );
      if (result.error) {
        throw new Error(result.error);
      }

      let updatedGameState = result.gameState;

      // Check if all players have now passed
      if (allPlayersHavePassed(updatedGameState)) {
        // Execute the pass phase - swap cards between players
        // This enters reveal phase (shows received cards)
        const executeResult = executePassPhase(updatedGameState);
        if (executeResult.error) {
          throw new Error(executeResult.error);
        }
        updatedGameState = executeResult.gameState;
        // Don't finalize yet - let player see received cards first
      }

      await updateRoomGameState(slug, updatedGameState);
      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  // Complete reveal phase and start play
  const completeRevealMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;

      // Complete the reveal phase and start play
      const updatedGameState = completeRevealPhase(currentGameState);

      await updateRoomGameState(slug, updatedGameState);
      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setSelectedCardsToPass([]); // Clear selection
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  // Start a completely new game mutation
  const newGameMutation = useMutation({
    mutationFn: async () => {
      if (!slug || !room) throw new Error("Room not found");
      const currentGameState = gameState ?? room.gameState;

      // Deal new cards
      const newHands = createAndDeal();

      // Reset the game completely
      let updatedGameState = resetGameForNewGame(currentGameState, newHands);

      // Process AI passes immediately if in passing phase
      if (updatedGameState.isPassingPhase) {
        updatedGameState = processAIPassesAndFinalize(
          updatedGameState,
          chooseAICardsToPass,
          finalizePassingPhase
        );
      }

      // Make sure room status is "playing"
      await updateRoomStatus(slug, "playing");
      await updateRoomGameState(slug, updatedGameState);

      return updatedGameState;
    },
    onSuccess: (updatedGameState) => {
      setShowGameEnd(false);
      showGameEndRef.current = false;
      setSelectedCardsToPass([]); // Reset pass selection for new game
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
    },
  });

  // Handle toggling a card for passing
  const handlePassCardToggle = (card: CardType) => {
    setSelectedCardsToPass((prev) => {
      const isSelected = prev.some((c) => cardsEqual(c, card));
      if (isSelected) {
        // Remove the card
        return prev.filter((c) => !cardsEqual(c, card));
      } else if (prev.length < 3) {
        // Add the card
        return [...prev, card];
      }
      return prev;
    });
  };

  // Handle confirming pass selection
  const handleConfirmPass = () => {
    if (selectedCardsToPass.length === 3) {
      submitPassMutation.mutate(selectedCardsToPass);
    }
  };

  // Handle going home from game end screen
  const handleGoHome = () => {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    clearCurrentRoom();
    navigate("/");
  };

  const handleJoin = () => {
    const playerName = prompt("Enter your name:");
    if (playerName && playerName.trim()) {
      joinRoomMutation.mutate(playerName.trim());
    }
  };

  const handleAddAIPlayers = () => {
    const slotsToFill = 4 - players.length;
    if (
      window.confirm(
        `Add ${slotsToFill} AI player${
          slotsToFill > 1 ? "s" : ""
        } to fill empty slots?`
      )
    ) {
      addAIPlayersMutation.mutate();
    }
  };

  const handleStartGame = () => {
    if (
      window.confirm(
        "Are you sure you want to start the game? All 4 players must be ready."
      )
    ) {
      startGameMutation.mutate();
    }
  };

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to leave this room?")) {
      leaveRoomMutation.mutate();
    }
  };

  const canJoin =
    roomStatus === "waiting" && players.length < 4 && !isPlayerInRoom;
  const canAddAI =
    roomStatus === "waiting" && players.length < 4 && players.length > 0;
  const canStart =
    players.length === 4 && roomStatus === "waiting" && isPlayerInRoom;
  const canLeave = isPlayerInRoom && roomStatus === "waiting";

  const playCardMutation = useMutation({
    mutationFn: async ({
      card,
      playerId,
    }: {
      card: CardType;
      playerId?: string;
    }) => {
      if (!slug || !room) throw new Error("Not in room");
      const currentGameState = gameState ?? room.gameState;
      const roomStatus = currentRoom.status ?? room.status;

      if (roomStatus !== "playing") {
        throw new Error("Game is not in progress");
      }

      // Use provided playerId (for AI) or currentPlayerId (for human)
      const targetPlayerId = playerId ?? currentPlayerId;
      if (!targetPlayerId) {
        throw new Error("No player ID provided");
      }

      const { playCard } = await import("../game/gameLogic");
      const result = playCard(currentGameState, targetPlayerId, card);

      if (result.error) {
        throw new Error(result.error);
      }

      // Check if game should end (someone has 100+ points)
      const gameOver = result.gameState.scores.some((score) => score >= 100);
      if (gameOver) {
        await updateRoomStatus(slug, "finished");
      }

      await updateRoomGameState(slug, result.gameState);

      return result.gameState;
    },
    onSuccess: (updatedGameState) => {
      // 1. Update store immediately with mutation result
      updateGameState(updatedGameState);
      queryClient.invalidateQueries({ queryKey: ["room", slug] });
      setSelectedCard(null);

      // Play card sound
      playSound("cardPlay");

      // Check if hearts just broke (compare with previous state)
      const prevHeartsBroken = currentGameState?.heartsBroken ?? false;
      if (!prevHeartsBroken && updatedGameState.heartsBroken) {
        setTimeout(() => playSound("heartsBroken"), 200);
      }

      // 2. Determine if a trick or round just finished
      const trickJustCompleted =
        updatedGameState.lastCompletedTrick &&
        updatedGameState.lastCompletedTrick.length === 4 &&
        updatedGameState.currentTrick.length === 0;

      if (trickJustCompleted) {
        // Play trick win sound
        setTimeout(() => playSound("trickWin"), 400);

        // Show the completed trick with winner highlight
        setShowCompletedTrick(true);
        setAnimatingToWinner(false);
        isAnimatingRef.current = true;

        // Sequence: Show trick (600ms) -> Animate to winner (1000ms) -> Show summary
        setTimeout(() => {
          setAnimatingToWinner(true);

          setTimeout(() => {
            setShowCompletedTrick(false);
            setAnimatingToWinner(false);
            isAnimatingRef.current = false;

            // Final state check - use the mutation result as source of truth
            if (
              updatedGameState.isGameOver &&
              updatedGameState.winnerIndex !== undefined
            ) {
              playSound("gameEnd");
              setShowGameEnd(true);
              showGameEndRef.current = true;
            } else if (updatedGameState.isRoundComplete) {
              // Check for shooting the moon
              const moonCheck = checkShootingTheMoon(
                updatedGameState.roundScores
              );
              if (moonCheck.shot) {
                playSound("shootTheMoon");
              }
              setShowRoundSummary(true);
              showRoundSummaryRef.current = true;
            }
          }, 1000);
        }, 600);
      }
    },
  });

  // Auto-play for AI players - watch ONLY currentPlayerIndex (single source of truth)
  useEffect(() => {
    // Don't play if game not active, animations running, or overlays showing
    if (
      roomStatus !== "playing" ||
      !currentGameState ||
      playCardMutation.isPending ||
      isAnimatingRef.current ||
      showRoundSummaryRef.current ||
      showGameEndRef.current
    ) {
      return;
    }

    const currentPlayerIndex = currentGameState.currentPlayerIndex;
    if (currentPlayerIndex === undefined) return;

    // Don't play during passing phase or if round/game ended
    if (
      currentGameState.isPassingPhase ||
      currentGameState.isRoundComplete ||
      currentGameState.isGameOver
    ) {
      return;
    }

    const currentPlayer = currentGameState.players[currentPlayerIndex];
    if (!currentPlayer.isAI) return;

    // Small delay for realism (AI "thinking")
    const timeoutId = setTimeout(() => {
      // Double-check conditions haven't changed
      const latestState = gameState ?? room?.gameState;
      if (
        !latestState ||
        latestState.currentPlayerIndex !== currentPlayerIndex ||
        latestState.players[currentPlayerIndex]?.id !== currentPlayer.id ||
        playCardMutation.isPending ||
        isAnimatingRef.current ||
        showRoundSummaryRef.current ||
        showGameEndRef.current
      ) {
        return;
      }

      const chosenCard = chooseAICard(latestState, currentPlayerIndex);
      playCardMutation.mutate({
        card: chosenCard,
        playerId: currentPlayer.id,
      });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [
    currentGameState?.currentPlayerIndex,
    currentGameState,
    roomStatus,
    playCardMutation,
    gameState,
    room,
    showCompletedTrick,
    animatingToWinner,
    showRoundSummary,
    showGameEnd,
  ]);

  const handleCardClick = (card: CardType) => {
    if (!currentPlayerId) return;

    const currentGameState = gameState ?? room?.gameState;
    if (!currentGameState) return;

    const playerIndex = currentGameState.players.findIndex(
      (p) => p.id === currentPlayerId
    );

    // Check if it's the player's turn
    if (currentGameState.currentPlayerIndex !== playerIndex) {
      return;
    }

    // Play card immediately
    playCardMutation.mutate({ card });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading room...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">
          Error: {error ? String(error) : "Room not found"}
        </div>
      </div>
    );
  }

  // Show game table when playing
  if (roomStatus === "playing") {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
        <header className="relative z-50 flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-white/10">
          <div className="w-full px-4 md:px-6 lg:px-8 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-sm transition-all border border-white/20 hover:border-white/30 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
                <div className="h-6 w-px bg-white/20" />
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-tight">
                    {slug}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isConnected
                          ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                          : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
                      }`}
                    />
                    <span
                      className={`text-xs md:text-sm font-medium transition-colors ${
                        isConnected ? "text-green-300" : "text-red-300"
                      }`}
                    >
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
              </div>
              {canLeave && (
                <button
                  onClick={handleLeave}
                  disabled={leaveRoomMutation.isPending}
                  className="px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {leaveRoomMutation.isPending ? "Leaving..." : "Leave Game"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Game Table - Takes remaining space */}
        <div className="flex-1 min-h-0 relative">
          {playCardMutation.isError && playCardMutation.error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                {playCardMutation.error instanceof Error
                  ? playCardMutation.error.message
                  : "Failed to play card"}
              </div>
            </div>
          )}
          <GameTable
            players={players}
            currentPlayerId={currentPlayerId}
            currentTrick={currentGameState?.currentTrick || []}
            gameState={currentGameState}
            selectedCard={selectedCard}
            showCompletedTrick={showCompletedTrick}
            animatingToWinner={animatingToWinner}
            cardHandRef={cardHandRef}
            onCardClick={handleCardClick}
          />
        </div>

        {/* Overlays with smooth transitions */}
        <AnimatePresence mode="wait">
          {/* Round Summary Overlay */}
          {showRoundSummary && currentGameState && (
            <RoundSummaryOverlay
              key="round-summary"
              players={players}
              roundNumber={currentGameState.roundNumber}
              roundScores={currentGameState.roundScores}
              totalScores={currentGameState.scores}
              shotTheMoon={
                checkShootingTheMoon(currentGameState.roundScores).shot
                  ? {
                      playerIndex: checkShootingTheMoon(
                        currentGameState.roundScores
                      ).playerIndex!,
                    }
                  : null
              }
              pointsCardsTaken={currentGameState.pointsCardsTaken}
              onNextRound={() => nextRoundMutation.mutate()}
              isLoading={nextRoundMutation.isPending}
            />
          )}

          {/* Game End Overlay */}
          {showGameEnd &&
            currentGameState &&
            currentGameState.winnerIndex !== undefined && (
              <GameEndOverlay
                key="game-end"
                players={players}
                scores={currentGameState.scores}
                winnerIndex={currentGameState.winnerIndex}
                onNewGame={() => newGameMutation.mutate()}
                onGoHome={handleGoHome}
                isLoading={newGameMutation.isPending}
              />
            )}
        </AnimatePresence>

        {/* Passing/Receiving Overlays - Crossfade transition */}
        <AnimatePresence>
          {/* Passing Phase Overlay */}
          {currentGameState?.isPassingPhase &&
            currentGameState.passDirection &&
            currentGameState.passDirection !== "none" &&
            currentPlayerId &&
            (() => {
              const playerIndex = players.findIndex(
                (p) => p.id === currentPlayerId
              );
              if (playerIndex === -1) return null;

              const hasSubmitted = hasPlayerSubmittedPass(
                currentGameState,
                currentPlayerId
              );
              const waitingForPlayers = players
                .filter(
                  (p) =>
                    !p.isAI && !hasPlayerSubmittedPass(currentGameState, p.id)
                )
                .map((p) => p.name);

              return (
                <PassingPhaseOverlay
                  key="passing-phase"
                  players={players}
                  currentPlayerIndex={playerIndex}
                  passDirection={currentGameState.passDirection}
                  selectedCards={selectedCardsToPass}
                  onCardToggle={handlePassCardToggle}
                  onConfirmPass={handleConfirmPass}
                  isSubmitting={submitPassMutation.isPending}
                  hasSubmitted={hasSubmitted}
                  waitingForPlayers={waitingForPlayers}
                />
              );
            })()}

          {/* Reveal Phase Overlay - Shows received cards */}
          {currentGameState?.isRevealPhase &&
            currentGameState.passDirection &&
            currentGameState.receivedCards &&
            currentPlayerId &&
            (() => {
              const playerIndex = players.findIndex(
                (p) => p.id === currentPlayerId
              );
              if (playerIndex === -1) return null;

              const receivedCards =
                currentGameState.receivedCards[playerIndex] || [];

              return (
                <ReceivedCardsOverlay
                  key="reveal-phase"
                  players={players}
                  currentPlayerIndex={playerIndex}
                  passDirection={currentGameState.passDirection}
                  receivedCards={receivedCards}
                  onReady={() => completeRevealMutation.mutate()}
                  isLoading={completeRevealMutation.isPending}
                />
              );
            })()}
        </AnimatePresence>
        <AIDebugOverlay />
      </div>
    );
  }

  // Lobby view when waiting
  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-green via-green-800 to-poker-green flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-poker-green">Game Room</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-2">Room Code</div>
          <div className="text-2xl font-mono font-bold text-poker-green bg-gray-100 p-3 rounded-lg">
            {slug}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Players ({players.length}/4)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((index) => {
              const player = players[index];
              const isCurrentPlayer = player?.id === currentPlayerId;
              return (
                <div
                  key={index}
                  className={cn(
                    // Base styles
                    "p-4 rounded-lg border-2",
                    // Conditional styles
                    isCurrentPlayer && "border-poker-green bg-green-50",
                    !isCurrentPlayer && player && "border-gray-200 bg-gray-50",
                    !player && "border-dashed border-gray-300 bg-gray-100"
                  )}
                >
                  {player ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {player.name}
                          {player.isAI && (
                            <span className="ml-2 text-xs text-gray-500">
                              (AI)
                            </span>
                          )}
                        </div>
                        {isCurrentPlayer && (
                          <div className="text-sm text-poker-green font-medium">
                            You
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">Empty Slot</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canJoin && (
            <button
              onClick={handleJoin}
              disabled={joinRoomMutation.isPending}
              className="px-6 py-3 bg-poker-green text-white rounded-lg hover:bg-green-800 disabled:opacity-50 font-semibold"
            >
              {joinRoomMutation.isPending ? "Joining..." : "Join as Player"}
            </button>
          )}

          {canAddAI && (
            <button
              onClick={handleAddAIPlayers}
              disabled={addAIPlayersMutation.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {addAIPlayersMutation.isPending
                ? "Adding AI..."
                : `Add AI Player${4 - players.length > 1 ? "s" : ""}`}
            </button>
          )}

          {canStart && (
            <button
              onClick={handleStartGame}
              disabled={startGameMutation.isPending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {startGameMutation.isPending ? "Starting..." : "Start Game"}
            </button>
          )}

          {canLeave && (
            <button
              onClick={handleLeave}
              disabled={leaveRoomMutation.isPending}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
            >
              {leaveRoomMutation.isPending ? "Leaving..." : "Leave Room"}
            </button>
          )}
        </div>

        {joinRoomMutation.isError && joinRoomMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {joinRoomMutation.error instanceof Error
              ? joinRoomMutation.error.message
              : "Failed to join"}
          </div>
        )}

        {addAIPlayersMutation.isError && addAIPlayersMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {addAIPlayersMutation.error instanceof Error
              ? addAIPlayersMutation.error.message
              : "Failed to add AI players"}
          </div>
        )}

        {startGameMutation.isError && startGameMutation.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {startGameMutation.error instanceof Error
              ? startGameMutation.error.message
              : "Failed to start game"}
          </div>
        )}

        {realtimeError && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            Realtime Error: {realtimeError}
          </div>
        )}
      </div>
    </div>
  );
}
