import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Volume2, VolumeX } from "lucide-react";
import { cn } from "../lib/utils";
import { soundManager } from "../lib/sounds";
import { playSound } from "../lib/sounds";
import { STORAGE_KEYS } from "../lib/constants";

export function SoundSettings() {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize from soundManager to ensure consistency
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return soundManager.getEnabled();
  });
  const [volume, setVolume] = useState(() => {
    return soundManager.getVolume();
  });

  // Sync sound manager when settings change
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    soundManager.setVolume(volume);
    localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(volume));
  }, [volume]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleToggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    if (newEnabled) {
      playSound("buttonClick");
    }
  };

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
        aria-label="Sound settings"
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
                <h2 className="text-xl font-bold text-white">Sound Settings</h2>
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
                      soundEnabled
                        ? "bg-emerald-500"
                        : "bg-gray-600"
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
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
