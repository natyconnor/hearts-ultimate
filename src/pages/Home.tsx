import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { generateSlug } from "../lib/slugGenerator";
import type { AIDifficulty, GameState } from "../types/game";
import {
  createRoom,
  updateRoomGameState,
  updateRoomStatus,
} from "../lib/roomApi";
import { createAIPlayer } from "../lib/aiPlayers";
import { createAndDeal } from "../game/deck";
import {
  startRoundWithPassingPhase,
  finalizePassingPhase,
} from "../game/gameLogic";
import { processAIPassesAndFinalize } from "../game/passingLogic";
import { chooseAICardsToPass } from "../lib/ai";
import { Heart } from "lucide-react";
import { cn } from "../lib/utils";
import { STORAGE_KEYS } from "../lib/constants";
import {
  CreateGameSection,
  type TestDifficulty,
} from "../components/CreateGameSection";

// Floating card component for background decoration
function FloatingCard({
  delay,
  duration,
  startX,
  startY,
  suit,
  rotation,
}: {
  delay: number;
  duration: number;
  startX: string;
  startY: string;
  suit: string;
  rotation: number;
}) {
  const isRed = suit === "♥" || suit === "♦";

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: startX, top: startY }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0.5, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        animate={{
          y: [0, -20, 0],
          scale: [0.9, 1, 0.9],
        }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ rotate: rotation }}
      >
        <div
          className={cn(
            // Layout & sizing
            "w-16 h-24 md:w-20 md:h-28",
            "flex items-center justify-center",
            // Visual styling
            "bg-white/10 backdrop-blur-sm rounded-xl",
            "border border-white/20 shadow-xl",
            "text-3xl md:text-4xl font-bold",
            // Conditional color
            isRed ? "text-red-400" : "text-white/80"
          )}
        >
          {suit}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { clearCurrentRoom, setCurrentRoom, setLoading, setError } =
    useGameStore();
  const [_testDifficulty, setTestDifficulty] =
    useState<TestDifficulty>("medium");

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!storedPlayerId) {
      clearCurrentRoom();
    }
  }, [clearCurrentRoom]);

  const createRoomMutation = useMutation({
    mutationFn: async (slug: string) => {
      setLoading(true);
      setError(null);
      return createRoom(slug);
    },
    onSuccess: (room) => {
      setCurrentRoom({
        roomId: room.id,
        slug: room.slug,
        status: room.status,
      });
      setLoading(false);
      navigate(`/room/${room.slug}`);
    },
    onError: (error: Error) => {
      setLoading(false);
      setError(error.message);
    },
  });

  const handleCreateGame = () => {
    const slug = generateSlug();
    createRoomMutation.mutate(slug);
  };

  const createTestRoomMutation = useMutation({
    mutationFn: async (difficulty: TestDifficulty) => {
      setLoading(true);
      setError(null);
      const slug = generateSlug();

      // Create room
      const room = await createRoom(slug);

      // Create 4 AI players with selected difficulty or random
      const getDifficulty = (): AIDifficulty => {
        if (difficulty === "random") {
          const difficulties: AIDifficulty[] = ["easy", "medium", "hard"];
          return difficulties[Math.floor(Math.random() * difficulties.length)];
        }
        return difficulty;
      };

      const aiPlayers = [
        createAIPlayer(
          "Alice",
          difficulty === "random" ? getDifficulty() : difficulty
        ),
        createAIPlayer(
          "Bob",
          difficulty === "random" ? getDifficulty() : difficulty
        ),
        createAIPlayer(
          "Charlie",
          difficulty === "random" ? getDifficulty() : difficulty
        ),
        createAIPlayer(
          "Diana",
          difficulty === "random" ? getDifficulty() : difficulty
        ),
      ];

      // Update game state with AI players
      const gameStateWithAI: GameState = {
        ...room.gameState,
        players: aiPlayers,
      };

      await updateRoomGameState(slug, gameStateWithAI);

      // Deal cards and start the game
      const hands = createAndDeal();
      let updatedGameState = startRoundWithPassingPhase(gameStateWithAI, hands);

      // Process AI passes immediately
      if (updatedGameState.isPassingPhase) {
        updatedGameState = processAIPassesAndFinalize(
          updatedGameState,
          chooseAICardsToPass,
          finalizePassingPhase
        );
      }

      await updateRoomGameState(slug, updatedGameState);
      await updateRoomStatus(slug, "playing");

      return {
        ...room,
        gameState: updatedGameState,
        status: "playing" as const,
      };
    },
    onSuccess: (room) => {
      setCurrentRoom({
        roomId: room.id,
        slug: room.slug,
        status: room.status,
      });
      setLoading(false);
      navigate(`/room/${room.slug}?test=true`);
    },
    onError: (error: Error) => {
      setLoading(false);
      setError(error.message);
    },
  });

  const handleCreateTestRoom = (difficulty: TestDifficulty) => {
    setTestDifficulty(difficulty);
    createTestRoomMutation.mutate(difficulty);
  };

  // Generate floating cards with stable values (memoized)
  const floatingCards = useMemo(
    () => [
      {
        delay: 0,
        duration: 8,
        startX: "10%",
        startY: "15%",
        suit: "♠",
        rotation: -8,
      },
      {
        delay: 1.5,
        duration: 10,
        startX: "82%",
        startY: "12%",
        suit: "♥",
        rotation: 12,
      },
      {
        delay: 3,
        duration: 9,
        startX: "18%",
        startY: "65%",
        suit: "♦",
        rotation: -5,
      },
      {
        delay: 2,
        duration: 11,
        startX: "78%",
        startY: "55%",
        suit: "♣",
        rotation: 8,
      },
      {
        delay: 4,
        duration: 8,
        startX: "48%",
        startY: "8%",
        suit: "♥",
        rotation: -3,
      },
      {
        delay: 0.5,
        duration: 12,
        startX: "6%",
        startY: "42%",
        suit: "♦",
        rotation: 10,
      },
      {
        delay: 2.5,
        duration: 9,
        startX: "88%",
        startY: "38%",
        suit: "♠",
        rotation: -12,
      },
      {
        delay: 3.5,
        duration: 10,
        startX: "55%",
        startY: "72%",
        suit: "♣",
        rotation: 6,
      },
    ],
    []
  );

  return (
    <div className="h-screen w-screen fixed inset-0 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(220,38,38,0.1),transparent_50%)]" />
      </div>

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Floating cards */}
      {floatingCards.map((card, i) => (
        <FloatingCard key={i} {...card} />
      ))}

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* Logo / Title section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10"
        >
          {/* Heart icon with glow */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="inline-block mb-5"
          >
            <div className="relative">
              <Heart
                className="w-16 h-16 md:w-20 md:h-20 text-red-500 fill-red-500"
                strokeWidth={1.5}
              />
              <motion.div
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 blur-xl bg-red-500/40 rounded-full"
              />
            </div>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-3">
            <span className="bg-gradient-to-r from-white via-red-200 to-white bg-clip-text text-transparent">
              Hearts
            </span>
          </h1>
          <p className="text-lg md:text-xl text-emerald-200/80 font-light tracking-wide">
            The Classic Card Game
          </p>
        </motion.div>

        {/* Create Game button and Test Mode section */}
        <CreateGameSection
          onCreateGame={handleCreateGame}
          onCreateTestRoom={handleCreateTestRoom}
          isCreatingRoom={createRoomMutation.isPending}
          isCreatingTestRoom={createTestRoomMutation.isPending}
          error={createRoomMutation.error}
        />

        {/* Decorative card suits at bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-5 text-3xl opacity-30">
          <span className="text-white/40">♠</span>
          <span className="text-red-400/50">♥</span>
          <span className="text-red-400/50">♦</span>
          <span className="text-white/40">♣</span>
        </div>
      </div>
    </div>
  );
}
