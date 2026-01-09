import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { generateSlug } from "../lib/slugGenerator";
import type { AIDifficulty } from "../types/game";
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
import type { GameState } from "../types/game";
import { Heart } from "lucide-react";
import { cn } from "../lib/utils";
import { STORAGE_KEYS } from "../lib/constants";

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

type TestDifficulty = AIDifficulty | "random";

const TEST_DIFFICULTY_OPTIONS: {
  value: TestDifficulty;
  label: string;
  icon: string;
}[] = [
  { value: "easy", label: "Easy", icon: "🌱" },
  { value: "medium", label: "Medium", icon: "⚡" },
  { value: "hard", label: "Hard", icon: "🧠" },
  { value: "random", label: "Random", icon: "🎲" },
];

export function Home() {
  const navigate = useNavigate();
  const { clearCurrentRoom, setCurrentRoom, setLoading, setError } =
    useGameStore();
  const [isHovered, setIsHovered] = useState(false);
  const [testDifficulty, setTestDifficulty] =
    useState<TestDifficulty>("medium");
  const [showTestDifficultyMenu, setShowTestDifficultyMenu] = useState(false);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!storedPlayerId) {
      clearCurrentRoom();
    }
  }, [clearCurrentRoom]);

  // Close test difficulty menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-test-difficulty-menu]")) {
        setShowTestDifficultyMenu(false);
      }
    };

    if (showTestDifficultyMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showTestDifficultyMenu]);

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
    mutationFn: async () => {
      setLoading(true);
      setError(null);
      const slug = generateSlug();

      // Create room
      const room = await createRoom(slug);

      // Create 4 AI players with selected difficulty or random
      const getDifficulty = (): AIDifficulty => {
        if (testDifficulty === "random") {
          const difficulties: AIDifficulty[] = ["easy", "medium", "hard"];
          return difficulties[Math.floor(Math.random() * difficulties.length)];
        }
        return testDifficulty;
      };

      const aiPlayers = [
        createAIPlayer(
          "Alice",
          testDifficulty === "random" ? getDifficulty() : testDifficulty
        ),
        createAIPlayer(
          "Bob",
          testDifficulty === "random" ? getDifficulty() : testDifficulty
        ),
        createAIPlayer(
          "Charlie",
          testDifficulty === "random" ? getDifficulty() : testDifficulty
        ),
        createAIPlayer(
          "Diana",
          testDifficulty === "random" ? getDifficulty() : testDifficulty
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

  const handleCreateTestRoom = () => {
    createTestRoomMutation.mutate();
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

        {/* Create Game button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col gap-4 items-center"
        >
          <motion.button
            onClick={handleCreateGame}
            disabled={createRoomMutation.isPending}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              // Layout & positioning
              "relative group px-10 py-4",
              // Typography
              "font-bold text-lg text-white",
              // Visual styling
              "bg-gradient-to-r from-emerald-600 to-emerald-500",
              "hover:from-emerald-500 hover:to-emerald-400",
              "rounded-2xl border border-emerald-400/30",
              "shadow-2xl shadow-emerald-900/50",
              // Interactions
              "transition-all duration-300 cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {/* Button glow effect */}
            <motion.div
              animate={{ opacity: isHovered ? 0.5 : 0 }}
              className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl"
            />

            {/* Button content */}
            <span className="relative flex items-center gap-3">
              {createRoomMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Creating Room...
                </>
              ) : (
                <>
                  <span className="text-xl">♠</span>
                  Create Game
                  <span className="text-xl">♥</span>
                </>
              )}
            </span>
          </motion.button>

          {/* Test Room section */}
          <div className="flex flex-col gap-2 items-center">
            {/* Test Difficulty Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="relative"
              data-test-difficulty-menu
            >
              <button
                onClick={() =>
                  setShowTestDifficultyMenu(!showTestDifficultyMenu)
                }
                disabled={createTestRoomMutation.isPending}
                className={cn(
                  "flex items-center gap-2 px-4 py-2",
                  "bg-white/5 backdrop-blur-sm rounded-lg",
                  "border border-white/10 hover:border-white/20",
                  "transition-all duration-200 text-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <span className="text-white/90 font-medium">
                  AI Level:{" "}
                  <span className="text-emerald-400">
                    {
                      TEST_DIFFICULTY_OPTIONS.find(
                        (d) => d.value === testDifficulty
                      )?.icon
                    }{" "}
                    {
                      TEST_DIFFICULTY_OPTIONS.find(
                        (d) => d.value === testDifficulty
                      )?.label
                    }
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-white/60 transition-transform",
                    showTestDifficultyMenu && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {showTestDifficultyMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "absolute top-full left-0 right-0 mt-2 z-50",
                      "bg-slate-800/95 backdrop-blur-lg rounded-xl",
                      "border border-white/10 shadow-2xl overflow-hidden"
                    )}
                  >
                    {TEST_DIFFICULTY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTestDifficulty(option.value);
                          setShowTestDifficultyMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left",
                          "hover:bg-white/5 transition-colors",
                          testDifficulty === option.value && "bg-emerald-500/10"
                        )}
                      >
                        <span className="text-xl mt-0.5">{option.icon}</span>
                        <div className="flex-1">
                          <div
                            className={cn(
                              "font-medium text-sm",
                              testDifficulty === option.value
                                ? "text-emerald-400"
                                : "text-white"
                            )}
                          >
                            {option.label}
                          </div>
                        </div>
                        {testDifficulty === option.value && (
                          <span className="text-emerald-400 mt-1">✓</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Test Room button */}
            <motion.button
              onClick={handleCreateTestRoom}
              disabled={createTestRoomMutation.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                // Layout & positioning
                "relative group px-6 py-2.5",
                // Typography
                "font-medium text-sm text-white/80",
                // Visual styling
                "bg-white/5 backdrop-blur-sm",
                "hover:bg-white/10",
                "rounded-xl border border-white/10 hover:border-white/20",
                // Interactions
                "transition-all duration-200 cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {createTestRoomMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block mr-2"
                  />
                  Creating Test Room...
                </>
              ) : (
                <>
                  <span className="mr-2">🧪</span>
                  Test Mode (4 AI Players)
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Error message */}
        {createRoomMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300"
          >
            {createRoomMutation.error instanceof Error
              ? createRoomMutation.error.message
              : "Failed to create room"}
          </motion.div>
        )}

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
