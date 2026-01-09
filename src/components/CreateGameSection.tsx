import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogIn } from "lucide-react";
import { cn } from "../lib/utils";
import type { AIDifficulty } from "../types/game";

export type TestDifficulty = AIDifficulty | "random";

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

interface CreateGameSectionProps {
  onCreateGame: () => void;
  onCreateTestRoom: (difficulty: TestDifficulty) => void;
  onJoinRoom: (slug: string) => void;
  isCreatingRoom: boolean;
  isCreatingTestRoom: boolean;
  isJoiningRoom: boolean;
  error: Error | null;
}

export function CreateGameSection({
  onCreateGame,
  onCreateTestRoom,
  onJoinRoom,
  isCreatingRoom,
  isCreatingTestRoom,
  isJoiningRoom,
  error,
}: CreateGameSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [testDifficulty, setTestDifficulty] =
    useState<TestDifficulty>("medium");
  const [showTestDifficultyMenu, setShowTestDifficultyMenu] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinSlug, setJoinSlug] = useState("");

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

  const handleCreateTestRoom = () => {
    onCreateTestRoom(testDifficulty);
  };

  const handleJoinRoom = () => {
    const trimmedSlug = joinSlug.trim();
    if (trimmedSlug) {
      onJoinRoom(trimmedSlug);
      setJoinSlug("");
      setShowJoinInput(false);
    }
  };

  const handleJoinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoinRoom();
    } else if (e.key === "Escape") {
      setShowJoinInput(false);
      setJoinSlug("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="flex flex-col gap-4 items-center"
    >
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <motion.button
          onClick={onCreateGame}
          disabled={isCreatingRoom || isJoiningRoom}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative group px-10 py-4",
            "font-bold text-lg text-white",
            "bg-gradient-to-r from-emerald-600 to-emerald-500",
            "hover:from-emerald-500 hover:to-emerald-400",
            "rounded-2xl border border-emerald-400/30",
            "shadow-2xl shadow-emerald-900/50",
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
            {isCreatingRoom ? (
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

        {/* Join Room Button/Input */}
        <AnimatePresence mode="wait">
          {!showJoinInput ? (
            <motion.button
              key="join-button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setShowJoinInput(true)}
              disabled={isJoiningRoom || isCreatingRoom}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative group px-6 py-4",
                "font-bold text-lg text-white",
                "bg-gradient-to-r from-blue-600 to-blue-500",
                "hover:from-blue-500 hover:to-blue-400",
                "rounded-2xl border border-blue-400/30",
                "shadow-2xl shadow-blue-900/50",
                "transition-all duration-300 cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              <LogIn className="w-5 h-5" />
              Join Room
            </motion.button>
          ) : (
            <motion.div
              key="join-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex gap-2 items-center"
            >
              <input
                type="text"
                value={joinSlug}
                onChange={(e) => setJoinSlug(e.target.value)}
                onKeyDown={handleJoinKeyPress}
                placeholder="Enter room code"
                autoFocus
                disabled={isJoiningRoom}
                className={cn(
                  "px-4 py-4",
                  "font-mono text-lg text-white",
                  "bg-white/10 backdrop-blur-sm",
                  "border border-white/20 rounded-2xl",
                  "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
                  "focus:border-blue-400/50",
                  "placeholder:text-white/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "w-48 sm:w-56"
                )}
              />
              <motion.button
                onClick={handleJoinRoom}
                disabled={isJoiningRoom || !joinSlug.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "px-6 py-4",
                  "font-bold text-lg text-white",
                  "bg-gradient-to-r from-blue-600 to-blue-500",
                  "hover:from-blue-500 hover:to-blue-400",
                  "rounded-2xl border border-blue-400/30",
                  "shadow-xl shadow-blue-900/50",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2"
                )}
              >
                {isJoiningRoom ? (
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
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Join
                  </>
                )}
              </motion.button>
              <button
                onClick={() => {
                  setShowJoinInput(false);
                  setJoinSlug("");
                }}
                disabled={isJoiningRoom}
                className={cn(
                  "px-4 py-4",
                  "text-white/80 hover:text-white",
                  "bg-white/5 hover:bg-white/10",
                  "rounded-2xl border border-white/10 hover:border-white/20",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
            onClick={() => setShowTestDifficultyMenu(!showTestDifficultyMenu)}
            disabled={isCreatingTestRoom}
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
          disabled={isCreatingTestRoom}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative group px-6 py-2.5",
            "font-medium text-sm text-white/80",
            "bg-white/5 backdrop-blur-sm",
            "hover:bg-white/10",
            "rounded-xl border border-white/10 hover:border-white/20",
            "transition-all duration-200 cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isCreatingTestRoom ? (
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

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300"
        >
          {error instanceof Error ? error.message : "Failed to create room"}
        </motion.div>
      )}
    </motion.div>
  );
}
