import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, LogOut, Play, Bot, Eye } from "lucide-react";
import { buttonClasses } from "../lib/styles";
import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

type ModalVariant = "danger" | "warning" | "info" | "success";
type IconType = "leave" | "start" | "ai" | "spectator" | "warning";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: ModalVariant;
  icon?: IconType;
}

const ICON_MAP: Record<IconType, LucideIcon> = {
  leave: LogOut,
  start: Play,
  ai: Bot,
  spectator: Eye,
  warning: AlertTriangle,
};

const VARIANT_STYLES: Record<
  ModalVariant,
  {
    accent: string;
    iconBg: string;
    iconShadow: string;
    buttonBg: string;
    buttonHover: string;
  }
> = {
  danger: {
    accent: "bg-gradient-to-r from-red-500 via-rose-500 to-red-600",
    iconBg: "bg-gradient-to-br from-red-500 to-rose-600",
    iconShadow: "shadow-red-500/30",
    buttonBg: "bg-gradient-to-r from-red-600 to-rose-600",
    buttonHover: "hover:from-red-500 hover:to-rose-500",
  },
  warning: {
    accent: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    iconShadow: "shadow-amber-500/30",
    buttonBg: "bg-gradient-to-r from-amber-600 to-orange-600",
    buttonHover: "hover:from-amber-500 hover:to-orange-500",
  },
  info: {
    accent: "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600",
    iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
    iconShadow: "shadow-blue-500/30",
    buttonBg: "bg-gradient-to-r from-blue-600 to-cyan-600",
    buttonHover: "hover:from-blue-500 hover:to-cyan-500",
  },
  success: {
    accent: "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600",
    iconBg: "bg-gradient-to-br from-emerald-500 to-green-600",
    iconShadow: "shadow-emerald-500/30",
    buttonBg: "bg-gradient-to-r from-emerald-600 to-green-600",
    buttonHover: "hover:from-emerald-500 hover:to-green-500",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "warning",
  icon = "warning",
}: ConfirmModalProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = ICON_MAP[icon];

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isLoading, onClose]);

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={cn(
                "relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl",
                "bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900",
                "border border-white/10"
              )}
            >
              {/* Decorative gradient accent */}
              <div className={cn("absolute top-0 left-0 right-0 h-1", styles.accent)} />

              {/* Close button */}
              <button
                onClick={onClose}
                disabled={isLoading}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 pt-8">
                {/* Icon Header */}
                <div className="flex justify-center mb-5">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                      styles.iconBg,
                      styles.iconShadow
                    )}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </motion.div>
                </div>

                {/* Title & Message */}
                <h2 className="text-xl font-bold text-white text-center mb-2">
                  {title}
                </h2>
                <p className="text-white/60 text-center text-sm mb-6 leading-relaxed">
                  {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className={cn(buttonClasses("secondary"), "flex-1")}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "text-white shadow-lg",
                      styles.buttonBg,
                      styles.buttonHover
                    )}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      confirmLabel
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
