import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Eye } from "lucide-react";
import { buttonClasses } from "../lib/styles";
import { cn } from "../lib/utils";

interface NameInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  title: string;
  subtitle?: string;
  placeholder?: string;
  submitLabel?: string;
  isLoading?: boolean;
  variant?: "player" | "spectator";
}

export function NameInputModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  subtitle,
  placeholder = "Enter your name",
  submitLabel = "Join",
  isLoading = false,
  variant = "player",
}: NameInputModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure animation has started
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) {
      onSubmit(trimmedName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const Icon = variant === "spectator" ? Eye : User;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
          >
            <div
              className={cn(
                "relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl",
                "bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900",
                "border border-white/10"
              )}
            >
              {/* Decorative gradient accent */}
              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-1",
                  variant === "spectator"
                    ? "bg-gradient-to-r from-purple-500 via-purple-400 to-violet-500"
                    : "bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500"
                )}
              />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 pt-8">
                {/* Icon Header */}
                <div className="flex justify-center mb-5">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center",
                      "shadow-lg",
                      variant === "spectator"
                        ? "bg-gradient-to-br from-purple-500 to-violet-600 shadow-purple-500/30"
                        : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30"
                    )}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-white/60 text-center text-sm mb-6">
                    {subtitle}
                  </p>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="player-name"
                      className="block text-sm font-medium text-white/70 mb-2"
                    >
                      Your Name
                    </label>
                    <input
                      ref={inputRef}
                      id="player-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={placeholder}
                      disabled={isLoading}
                      maxLength={20}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl text-white text-lg",
                        "bg-black/30 border-2 transition-all duration-200",
                        "placeholder-white/30",
                        "focus:outline-none",
                        "disabled:opacity-50",
                        variant === "spectator"
                          ? "border-purple-500/30 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                          : "border-emerald-500/30 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className={cn(
                        buttonClasses("secondary"),
                        "flex-1"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !name.trim()}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        variant === "spectator"
                          ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-900/30"
                          : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/30"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {isLoading ? "Joining..." : submitLabel}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
