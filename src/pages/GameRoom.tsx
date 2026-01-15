import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { useRoomSync } from "../hooks/useRoomSync";
import { useRoomNavigationBlocker } from "../hooks/useRoomNavigationBlocker";
import { usePageUnloadWarning } from "../hooks/usePageUnloadWarning";
import { useRecordGameResult } from "../hooks/useRecordGameResult";
import { usePlayerPresence } from "../hooks/usePlayerPresence";
import { useDisconnectionDetection } from "../hooks/useDisconnectionDetection";
import { usePlayerReconnection } from "../hooks/usePlayerReconnection";
import {
  useLobbyMutations,
  useGameplayMutations,
  useSpectatorMutations,
} from "../hooks/useGameMutations";
import { useGameStore } from "../store/gameStore";
import { STORAGE_KEYS, getAIDelayFromSpeed } from "../lib/constants";
import { getStoredAISpeed } from "../lib/settings";
import { chooseAICard } from "../lib/ai";
import { hasPlayerSubmittedPass } from "../game/passingLogic";
import { hasPlayerConfirmedReveal } from "../game/gameLogic";
import { cardsEqual } from "../game/cardDisplay";
import { GameTable } from "../components/GameTable";
import { GameEndOverlay } from "../components/GameEndOverlay";
import { RoundSummaryOverlay } from "../components/RoundSummaryOverlay";
import { PassingPhaseOverlay } from "../components/PassingPhaseOverlay";
import { ReceivedCardsOverlay } from "../components/ReceivedCardsOverlay";
import { AIDebugOverlay } from "../components/AIDebugOverlay";
import { GameLobby } from "../components/GameLobby";
import { GameHeader } from "../components/GameHeader";
import { SpectatorControls } from "../components/SpectatorControls";
import { NameInputModal } from "../components/NameInputModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { DisconnectionOverlay } from "../components/DisconnectionOverlay";
import { GameEndedOverlay } from "../components/GameEndedOverlay";
import type { Card as CardType, GameRoom as GameRoomType } from "../types/game";

export function GameRoom() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    gameState,
    spectators,
    currentRoom,
    setCurrentRoom,
    updateGameState,
    updateSpectators,
    clearCurrentRoom,
  } = useGameStore();

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.PLAYER_ID)
  );
  const [currentSpectatorId, setCurrentSpectatorId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEYS.SPECTATOR_ID)
  );
  const [watchingPlayerIndex, setWatchingPlayerIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showCompletedTrick, setShowCompletedTrick] = useState(false);
  const [animatingToWinner, setAnimatingToWinner] = useState(false);
  const [selectedCardsToPass, setSelectedCardsToPass] = useState<CardType[]>(
    []
  );
  // Track if user has dismissed the auto-spectator prompt
  const [dismissedSpectatorPrompt, setDismissedSpectatorPrompt] =
    useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const cardHandRef = useRef<HTMLDivElement>(null);
  // Use ref for animation state to avoid closure issues in useEffect
  const isAnimatingRef = useRef(false);

  // Use Convex query - automatically reactive, no need for separate realtime hook
  const convexRoom = useQuery(api.rooms.getBySlug, slug ? { slug } : "skip");

  // Convert Convex room to our GameRoom type - memoized to prevent unnecessary re-renders
  const room: GameRoomType | null = useMemo(() => {
    if (!convexRoom) return null;
    return {
      id: convexRoom._id,
      slug: convexRoom.slug,
      status: convexRoom.status,
      gameState: convexRoom.gameState,
      spectators: convexRoom.spectators,
      createdAt: new Date(convexRoom._creationTime).toISOString(),
    };
  }, [convexRoom]);

  const isLoading = convexRoom === undefined;
  const error = null; // Convex throws on errors

  // Convex queries are automatically reactive - isConnected is always true when using Convex
  const isConnected = convexRoom !== undefined;
  const realtimeError = null;

  useRoomSync(room, slug);

  const currentGameState = gameState ?? room?.gameState ?? null;
  const players = useMemo(
    () => currentGameState?.players ?? [],
    [currentGameState?.players]
  );
  const roomStatus = currentRoom.status ?? room?.status ?? "waiting";

  // Derive overlay visibility directly from game state (no effects needed)
  // When nextRound/newGame mutations complete, game state changes and overlays hide automatically
  const showRoundSummary =
    !!currentGameState?.isRoundComplete && !currentGameState?.isGameOver;
  const showGameEnd =
    !!currentGameState?.isGameOver &&
    currentGameState?.winnerIndex !== undefined;

  // Show "game ended unexpectedly" overlay when game was ended by player leaving/disconnecting
  const showGameEndedUnexpectedly =
    roomStatus === "finished" &&
    currentGameState?.endReason &&
    (currentGameState.endReason === "player_left" ||
      currentGameState.endReason === "player_disconnected");

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
      setSelectedCard,
      isAnimatingRef,
    },
  });

  const spectatorMutations = useSpectatorMutations({
    slug,
    spectatorId: currentSpectatorId,
    setSpectatorId: setCurrentSpectatorId,
    setSpectators: updateSpectators,
  });

  useEffect(() => {
    return () => {
      const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
      const storedSpectatorId = localStorage.getItem(STORAGE_KEYS.SPECTATOR_ID);
      if (!storedPlayerId && !storedSpectatorId) {
        clearCurrentRoom();
      }
    };
  }, [clearCurrentRoom]);

  const currentPlayer = currentPlayerId
    ? players.find((p) => p.id === currentPlayerId) ?? null
    : null;
  const isPlayerInRoom = !!currentPlayer;
  const currentSpectator = currentSpectatorId
    ? spectators.find((s) => s.id === currentSpectatorId) ?? null
    : null;
  // Only consider "spectating" if the spectator ID is valid for THIS room's spectator list
  // This prevents a flash of SpectatorControls when leaving a game with a stale spectator ID
  const isSpectating = !!currentSpectator;

  // Auto-spectate: derived state for when to show the prompt
  const showAutoSpectatorModal =
    !!room &&
    roomStatus === "playing" &&
    !isPlayerInRoom &&
    !isSpectating &&
    !spectatorMutations.joinSpectator.isPending &&
    !dismissedSpectatorPrompt;

  // Handle reconnection for returning players
  usePlayerReconnection({
    slug: slug ?? null,
    gameState: currentGameState,
    roomStatus,
    currentPlayerId,
    setCurrentPlayerId,
    updateGameState,
  });

  // Get current player's name for presence tracking
  const currentPlayerName = currentPlayer?.name ?? null;

  // Track player presence
  const { onlinePlayerIds } = usePlayerPresence({
    slug: slug ?? null,
    playerId: currentPlayerId,
    playerName: currentPlayerName,
    enabled: isPlayerInRoom && !isSpectating,
  });

  // Callback when game ends due to disconnection
  const handleGameEndedByDisconnection = useCallback(() => {
    // The game has ended because a player disconnected and didn't reconnect
    // No need to navigate - the room status change will be picked up by Convex
  }, []);

  // Detect disconnected players and manage grace period
  const { disconnectedPlayers, isWaitingForReconnection } =
    useDisconnectionDetection({
      slug: slug ?? null,
      gameState: currentGameState,
      roomStatus,
      currentPlayerId,
      onlinePlayerIds,
      enabled: isPlayerInRoom && !isSpectating,
      onGameEnded: handleGameEndedByDisconnection,
    });

  // Navigation blocker - now returns state for modal instead of using window.confirm
  const {
    isBlocked: isNavigationBlocked,
    isLeaving: isNavigationLeaving,
    blockMessage: navigationBlockMessage,
    handleConfirmLeave: handleConfirmNavigation,
    handleCancelLeave: handleCancelNavigation,
  } = useRoomNavigationBlocker({
    slug: slug ?? null,
    isPlayerInRoom,
    roomStatus,
    currentPlayerId,
    currentGameState,
  });

  usePageUnloadWarning({
    isPlayerInRoom,
    roomStatus,
    enabled: !!(slug && room && (currentPlayerId || currentSpectatorId)),
  });

  // Record game stats when game ends (silently, in background)
  useRecordGameResult({
    gameState: currentGameState,
    currentPlayerId,
    showGameEnd,
  });

  const handleAutoSpectatorSubmit = (name: string) => {
    spectatorMutations.joinSpectator.mutate(name, {
      onSuccess: () => setDismissedSpectatorPrompt(true),
    });
  };

  const handleDismissAutoSpectator = () => {
    setDismissedSpectatorPrompt(true);
  };

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
    localStorage.removeItem(STORAGE_KEYS.SPECTATOR_ID);
    localStorage.removeItem(STORAGE_KEYS.SPECTATOR_NAME);
    clearCurrentRoom();
    navigate("/");
  };

  const handleLeave = () => {
    setShowLeaveConfirmModal(true);
  };

  const handleConfirmLeave = () => {
    lobbyMutations.leaveRoom.mutate(undefined, {
      onSuccess: () => setShowLeaveConfirmModal(false),
    });
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
      showRoundSummary ||
      showGameEnd
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

    const currentPlayerInGame = currentGameState.players[currentPlayerIndex];
    if (!currentPlayerInGame.isAI) return;

    // In test mode, skip delays for fast playthrough
    // Otherwise, use the user's configured AI play speed
    const delay = isTestMode ? 50 : getAIDelayFromSpeed(getStoredAISpeed());

    const timeoutId = setTimeout(() => {
      // Double-check conditions haven't changed
      const latestState = gameState ?? room?.gameState;
      if (
        !latestState ||
        latestState.currentPlayerIndex !== currentPlayerIndex ||
        latestState.players[currentPlayerIndex]?.id !==
          currentPlayerInGame.id ||
        gameplayMutations.playCard.isPending
      ) {
        return;
      }

      const chosenCard = chooseAICard(latestState, currentPlayerIndex);
      gameplayMutations.playCard.mutate({
        card: chosenCard,
        playerId: currentPlayerInGame.id,
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

    const latestGameState = gameState ?? room?.gameState;
    if (!latestGameState) return;

    const playerIndex = latestGameState.players.findIndex(
      (p) => p.id === currentPlayerId
    );

    // Check if it's the player's turn
    if (latestGameState.currentPlayerIndex !== playerIndex) {
      return;
    }

    // Play card immediately
    gameplayMutations.playCard.mutate({ card });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="text-xl text-white">Loading room...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="text-xl text-red-400">
          Error: {error ? String(error) : "Room not found"}
        </div>
      </div>
    );
  }

  // Show game table when playing or when game just finished (to show GameEndOverlay)
  // Also show when game ended unexpectedly (player left/disconnected)
  // Spectators also see the game table when game is playing
  if (
    roomStatus === "playing" ||
    (roomStatus === "finished" && (showGameEnd || showGameEndedUnexpectedly))
  ) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
        <GameHeader
          slug={slug ?? ""}
          isConnected={isConnected}
          canLeave={canLeave}
          isLeaving={lobbyMutations.leaveRoom.isPending}
          onLeave={handleLeave}
        />

        {/* Spectator Controls - Show when spectating */}
        {isSpectating && (
          <div className="px-4 py-2 flex justify-center">
            <SpectatorControls
              players={players}
              spectators={spectators}
              watchingPlayerIndex={watchingPlayerIndex}
              onChangeWatchingPlayer={setWatchingPlayerIndex}
              currentSpectatorName={currentSpectator?.name}
            />
          </div>
        )}

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
            isSpectating={isSpectating}
            watchingPlayerIndex={watchingPlayerIndex}
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
              roundHistory={currentGameState.roundHistory}
              onNextRound={() => gameplayMutations.nextRound.mutate()}
              isLoading={gameplayMutations.nextRound.isPending}
            />
          )}

          {/* Game End Overlay - Normal game completion */}
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

          {/* Game Ended Unexpectedly Overlay - Player left or disconnected */}
          {showGameEndedUnexpectedly &&
            currentGameState &&
            (currentGameState.endReason === "player_left" ||
              currentGameState.endReason === "player_disconnected") && (
              <GameEndedOverlay
                key="game-ended-unexpectedly"
                endReason={currentGameState.endReason}
                playerName={currentGameState.endedByPlayerName}
                onGoToLobby={() => lobbyMutations.returnToLobby.mutate()}
                isLoadingLobby={lobbyMutations.returnToLobby.isPending}
                isPlayerInRoom={isPlayerInRoom}
              />
            )}
        </AnimatePresence>

        {/* Passing/Receiving Overlays - Crossfade transition (only for players, not spectators) */}
        {!isSpectating && (
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

                // Check if this player has already confirmed ready
                const hasConfirmedReady = hasPlayerConfirmedReveal(
                  currentGameState,
                  currentPlayerId
                );

                // Get list of human players still reviewing
                const waitingForPlayers = players
                  .filter(
                    (p) =>
                      !p.isAI &&
                      p.id !== currentPlayerId &&
                      !hasPlayerConfirmedReveal(currentGameState, p.id)
                  )
                  .map((p) => p.name);

                return (
                  <ReceivedCardsOverlay
                    key="reveal-phase"
                    players={players}
                    currentPlayerIndex={playerIndex}
                    passDirection={currentGameState.passDirection}
                    receivedCards={receivedCards}
                    onReady={() => gameplayMutations.completeReveal.mutate()}
                    isLoading={gameplayMutations.completeReveal.isPending}
                    hasConfirmedReady={hasConfirmedReady}
                    waitingForPlayers={waitingForPlayers}
                  />
                );
              })()}
          </AnimatePresence>
        )}
        <AIDebugOverlay />

        {/* Disconnection Overlay - shows when waiting for player to reconnect */}
        <AnimatePresence>
          {isWaitingForReconnection && (
            <DisconnectionOverlay disconnectedPlayers={disconnectedPlayers} />
          )}
        </AnimatePresence>

        {/* Leave Confirm Modal */}
        <ConfirmModal
          isOpen={showLeaveConfirmModal}
          onClose={() => setShowLeaveConfirmModal(false)}
          onConfirm={handleConfirmLeave}
          title="Leave Room?"
          message="Are you sure you want to leave this room? You can rejoin later if there's space."
          confirmLabel="Leave"
          isLoading={lobbyMutations.leaveRoom.isPending}
          variant="danger"
          icon="leave"
        />

        {/* Navigation Blocker Modal - shown when trying to navigate away */}
        <ConfirmModal
          isOpen={isNavigationBlocked}
          onClose={handleCancelNavigation}
          onConfirm={handleConfirmNavigation}
          title="Leave Game?"
          message={navigationBlockMessage}
          confirmLabel="Leave"
          cancelLabel="Stay"
          isLoading={isNavigationLeaving}
          variant="danger"
          icon="leave"
        />

        {/* Auto-Spectator Modal - shown when arriving at an in-progress game */}
        <NameInputModal
          isOpen={showAutoSpectatorModal}
          onClose={handleDismissAutoSpectator}
          onSubmit={handleAutoSpectatorSubmit}
          title="Game in Progress"
          subtitle="This game has already started. Enter your name to watch as a spectator."
          placeholder="Your name"
          submitLabel="Watch Game"
          isLoading={spectatorMutations.joinSpectator.isPending}
          variant="spectator"
        />
      </div>
    );
  }

  // Lobby view when waiting
  return (
    <GameLobby
      slug={slug ?? ""}
      players={players}
      spectators={spectators}
      currentPlayerId={currentPlayerId}
      currentSpectatorId={currentSpectatorId}
      isConnected={isConnected}
      roomStatus={roomStatus}
      lobbyMutations={lobbyMutations}
      spectatorMutations={spectatorMutations}
      realtimeError={realtimeError}
    />
  );
}
