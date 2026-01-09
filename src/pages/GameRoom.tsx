import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { getRoomBySlug } from "../lib/roomApi";
import { useGameRealtime } from "../hooks/useGameRealtime";
import { useRoomSync } from "../hooks/useRoomSync";
import { useRoomNavigationBlocker } from "../hooks/useRoomNavigationBlocker";
import { usePageUnloadWarning } from "../hooks/usePageUnloadWarning";
import {
  useLobbyMutations,
  useGameplayMutations,
} from "../hooks/useGameMutations";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS } from "../lib/constants";
import { chooseAICard } from "../lib/ai";
import { hasPlayerSubmittedPass } from "../game/passingLogic";
import { cardsEqual } from "../game/cardDisplay";
import { GameTable } from "../components/GameTable";
import { GameEndOverlay } from "../components/GameEndOverlay";
import { RoundSummaryOverlay } from "../components/RoundSummaryOverlay";
import { PassingPhaseOverlay } from "../components/PassingPhaseOverlay";
import { ReceivedCardsOverlay } from "../components/ReceivedCardsOverlay";
import { AIDebugOverlay } from "../components/AIDebugOverlay";
import { GameLobby } from "../components/GameLobby";
import { GameHeader } from "../components/GameHeader";
import type { Card as CardType } from "../types/game";

export function GameRoom() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  const currentGameState = gameState ?? room?.gameState ?? null;
  const players = useMemo(
    () => currentGameState?.players ?? [],
    [currentGameState?.players]
  );
  const roomStatus = currentRoom.status ?? room?.status ?? "waiting";

  // Test mode: enabled via URL param or if all players are AI
  const isTestMode =
    searchParams.get("test") === "true" ||
    (players.length === 4 && players.every((p) => p.isAI));

  // Initialize hooks after room is available
  const lobbyMutations = useLobbyMutations({
    slug,
    room,
    gameState,
    currentRoom,
    currentPlayerId,
    updateGameState,
    setCurrentPlayerId,
    setCurrentRoom,
    setSelectedCardsToPass,
  });

  const gameplayMutations = useGameplayMutations({
    slug,
    room,
    gameState,
    currentRoom,
    currentPlayerId,
    isTestMode,
    updateGameState,
    setSelectedCardsToPass,
    animationCallbacks: {
      setShowCompletedTrick,
      setAnimatingToWinner,
      setShowRoundSummary,
      setShowGameEnd,
      setSelectedCard,
      isAnimatingRef,
      showRoundSummaryRef,
      showGameEndRef,
    },
  });

  useEffect(() => {
    return () => {
      const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      if (!storedPlayerId) {
        clearCurrentRoom();
      }
    };
  }, [clearCurrentRoom]);

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

  // Auto-advance round summary in test mode
  useEffect(() => {
    if (
      isTestMode &&
      showRoundSummary &&
      !gameplayMutations.nextRound.isPending
    ) {
      const timeoutId = setTimeout(() => {
        gameplayMutations.nextRound.mutate();
      }, 500); // Brief delay to see the summary
      return () => clearTimeout(timeoutId);
    }
  }, [showRoundSummary, isTestMode, gameplayMutations.nextRound]);

  // In test mode, game end stops and requires button press (logs preserved for copying)

  // Auto-start game when 4 AI players are added in test mode
  const allPlayersAreAI = useMemo(
    () => players.length === 4 && players.every((p) => p.isAI),
    [players]
  );

  useEffect(() => {
    if (
      isTestMode &&
      roomStatus === "waiting" &&
      allPlayersAreAI &&
      !lobbyMutations.startGame.isPending
    ) {
      const timeoutId = setTimeout(() => {
        lobbyMutations.startGame.mutate();
      }, 500); // Brief delay after adding players
      return () => clearTimeout(timeoutId);
    }
  }, [isTestMode, roomStatus, allPlayersAreAI, lobbyMutations.startGame]);

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
      gameplayMutations.submitPass.mutate(selectedCardsToPass);
    }
  };

  // Handle going home from game end screen
  const handleGoHome = () => {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    clearCurrentRoom();
    navigate("/");
  };

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to leave this room?")) {
      lobbyMutations.leaveRoom.mutate();
    }
  };

  const canLeave = isPlayerInRoom && roomStatus === "waiting";

  // Auto-play for AI players - watch ONLY currentPlayerIndex (single source of truth)
  useEffect(() => {
    // Don't play if game not active, animations running, or overlays showing
    if (
      roomStatus !== "playing" ||
      !currentGameState ||
      gameplayMutations.playCard.isPending ||
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

    // In test mode, skip delays for fast playthrough
    const delay = isTestMode ? 50 : 800;

    const timeoutId = setTimeout(() => {
      // Double-check conditions haven't changed
      const latestState = gameState ?? room?.gameState;
      if (
        !latestState ||
        latestState.currentPlayerIndex !== currentPlayerIndex ||
        latestState.players[currentPlayerIndex]?.id !== currentPlayer.id ||
        gameplayMutations.playCard.isPending ||
        (!isTestMode &&
          (isAnimatingRef.current ||
            showRoundSummaryRef.current ||
            showGameEndRef.current))
      ) {
        return;
      }

      const chosenCard = chooseAICard(latestState, currentPlayerIndex);
      gameplayMutations.playCard.mutate({
        card: chosenCard,
        playerId: currentPlayer.id,
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [
    currentGameState?.currentPlayerIndex,
    currentGameState,
    roomStatus,
    gameplayMutations.playCard,
    gameState,
    room,
    showCompletedTrick,
    animatingToWinner,
    showRoundSummary,
    showGameEnd,
    isTestMode,
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
    gameplayMutations.playCard.mutate({ card });
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

  // Show game table when playing or when game just finished (to show GameEndOverlay)
  if (roomStatus === "playing" || (roomStatus === "finished" && showGameEnd)) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
        <GameHeader
          slug={slug ?? ""}
          isConnected={isConnected}
          canLeave={canLeave}
          isLeaving={lobbyMutations.leaveRoom.isPending}
          onLeave={handleLeave}
        />

        {/* Game Table - Takes remaining space */}
        <div className="flex-1 min-h-0 relative">
          {gameplayMutations.playCard.isError &&
            gameplayMutations.playCard.error && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                  {gameplayMutations.playCard.error instanceof Error
                    ? gameplayMutations.playCard.error.message
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
              shotTheMoon={currentGameState.shotTheMoon}
              pointsCardsTaken={currentGameState.pointsCardsTaken}
              onNextRound={() => gameplayMutations.nextRound.mutate()}
              isLoading={gameplayMutations.nextRound.isPending}
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
                onNewGame={() => gameplayMutations.newGame.mutate()}
                onGoHome={handleGoHome}
                isLoading={gameplayMutations.newGame.isPending}
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
                  isSubmitting={gameplayMutations.submitPass.isPending}
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
                  onReady={() => gameplayMutations.completeReveal.mutate()}
                  isLoading={gameplayMutations.completeReveal.isPending}
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
    <GameLobby
      slug={slug ?? ""}
      players={players}
      currentPlayerId={currentPlayerId}
      isConnected={isConnected}
      roomStatus={roomStatus}
      lobbyMutations={lobbyMutations}
      realtimeError={realtimeError}
    />
  );
}
