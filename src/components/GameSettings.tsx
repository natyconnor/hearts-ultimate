import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Volume2, VolumeX, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { soundManager } from "../lib/sounds";
import { playSound } from "../lib/sounds";
import { STORAGE_KEYS } from "../lib/constants";
import { getStoredAISpeed } from "../lib/settings";

export function GameSettings() {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize from soundManager to ensure consistency
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return soundManager.getEnabled();
  });
  const [volume, setVolume] = useState(() => {
    return soundManager.getVolume();
  });
  const [aiSpeed, setAISpeed] = useState(() => getStoredAISpeed());

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
    localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(newVolume));
  };

  const handleToggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundManager.setEnabled(newEnabled);
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(newEnabled));
    if (newEnabled) {
      playSound("buttonClick");
    }
  };

  const handleAISpeedChange = (newSpeed: number) => {
    setAISpeed(newSpeed);
    localStorage.setItem(STORAGE_KEYS.AI_PLAY_SPEED, String(newSpeed));
  };

  // Get display text and emoji for AI speed
  // Note: speed 0 = slow, speed 1 = fast (slider goes left to right)
  const getSpeedInfo = (speed: number): { label: string; emoji: string } => {
    if (speed >= 0.8) return { label: "Very Fast", emoji: "⚡" };
    if (speed >= 0.6) return { label: "Fast", emoji: "🏃" };
    if (speed >= 0.4) return { label: "Normal", emoji: "🚶" };
    if (speed >= 0.2) return { label: "Slow", emoji: "🐢" };
    return { label: "Very Slow", emoji: "🦥" };
  };

  const speedInfo = getSpeedInfo(aiSpeed);

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          if (soundEnabled) {
            playSound("buttonClick");
          }
        }}
        className={cn(
          "flex items-center justify-center",
          "w-10 h-10 rounded-lg",
          "bg-white/10 hover:bg-white/20",
          "text-white transition-all",
          "border border-white/20 hover:border-white/30",
          "focus:outline-none focus:ring-2 focus:ring-white/50"
        )}
        aria-label="Game settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Settings Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />

            {/* Settings Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed top-4 left-4 z-[101] bg-slate-800/95 backdrop-blur-lg rounded-xl border border-white/10 shadow-2xl p-6 w-80"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Game Settings</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "p-1.5 rounded-lg",
                    "hover:bg-white/10 transition-colors",
                    "text-white/70 hover:text-white"
                  )}
                  aria-label="Close settings"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AI Speed Slider */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <label
                    htmlFor="ai-speed-slider"
                    className="text-sm font-medium text-white/90"
                  >
                    AI Play Speed
                  </label>
                  <span className="ml-auto text-sm text-white/70 flex items-center gap-1.5">
                    <span>{speedInfo.emoji}</span>
                    <span>{speedInfo.label}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50">Slow</span>
                  <input
                    type="range"
                    id="ai-speed-slider"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiSpeed}
                    onChange={(e) =>
                      handleAISpeedChange(parseFloat(e.target.value))
                    }
                    className={cn(
                      "flex-1 h-2 rounded-full appearance-none cursor-pointer",
                      "bg-gray-700 accent-amber-500",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer",
                      "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    )}
                  />
                  <span className="text-xs text-white/50">Fast</span>
                </div>
                <p className="text-xs text-white/60 mt-2">
                  Adjust how quickly AI players make their moves
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 mb-6" />

              {/* Sound Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="sound-toggle"
                    className="text-sm font-medium text-white/90"
                  >
                    Sound Effects
                  </label>
                  <button
                    onClick={handleToggleSound}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors",
                      soundEnabled ? "bg-emerald-500" : "bg-gray-600"
                    )}
                    id="sound-toggle"
                    aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
                  >
                    <motion.div
                      layout
                      className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md",
                        "flex items-center justify-center"
                      )}
                      animate={{
                        x: soundEnabled ? 24 : 2,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      {soundEnabled ? (
                        <Volume2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <VolumeX className="w-3 h-3 text-gray-600" />
                      )}
                    </motion.div>
                  </button>
                </div>
                <p className="text-xs text-white/60">
                  Enable or disable game sound effects
                </p>
              </div>

              {/* Volume Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="volume-slider"
                    className="text-sm font-medium text-white/90"
                  >
                    Volume
                  </label>
                  <span className="text-sm text-white/70">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  id="volume-slider"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) =>
                    handleVolumeChange(parseFloat(e.target.value))
                  }
                  disabled={!soundEnabled}
                  className={cn(
                    "w-full h-2 rounded-full appearance-none cursor-pointer",
                    "bg-gray-700 accent-emerald-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer",
                    "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  )}
                />
                <p className="text-xs text-white/60 mt-2">
                  Adjust the volume of sound effects
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
