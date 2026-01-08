import { cn } from "./utils";

/**
 * Common button styles
 */
export const buttonBase = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

export const buttonPrimary = "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-900/30";

export const buttonSecondary = "bg-white/10 hover:bg-white/20 text-white border border-white/20";

export const buttonBlue = "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-900/30";

export const buttonGreen = "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-green-500/30";

/**
 * Helper function to compose button classes
 */
export function buttonClasses(variant: "primary" | "secondary" | "blue" | "green" = "primary") {
  return cn(
    buttonBase,
    variant === "primary" && buttonPrimary,
    variant === "secondary" && buttonSecondary,
    variant === "blue" && buttonBlue,
    variant === "green" && buttonGreen
  );
}

/**
 * Overlay background styles
 */
export const overlayBackground = "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm";

export const overlayContent = "relative max-w-lg w-full mx-4 overflow-hidden";

/**
 * Score text color helpers
 */
export function getScoreColor(score: number, type: "round" | "total" = "round"): string {
  if (type === "round") {
    if (score === 0) return "text-green-400";
    if (score >= 13) return "text-red-400";
    return "text-white";
  } else {
    // total score
    if (score >= 80) return "text-red-400";
    if (score >= 50) return "text-yellow-400";
    return "text-white";
  }
}

/**
 * Rank badge styles
 */
export function getRankBadgeClasses(rank: number): string {
  return cn(
    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
    rank === 0 && "bg-yellow-500 text-yellow-900",
    rank === 1 && "bg-gray-400 text-gray-800",
    rank === 2 && "bg-amber-700 text-amber-100",
    rank >= 3 && "bg-white/20 text-white"
  );
}

/**
 * Rank row background styles
 */
export function getRankRowClasses(rank: number): string {
  return cn(
    "flex items-center justify-between p-3 rounded-xl transition-all",
    rank === 0 && "bg-gradient-to-r from-yellow-500/30 to-yellow-600/20 border border-yellow-500/40",
    rank === 1 && "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border border-gray-400/30",
    rank === 2 && "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border border-amber-700/30",
    rank >= 3 && "bg-white/5 border border-white/10"
  );
}

/**
 * Progress bar gradient colors
 */
export function getProgressBarColor(maxScore: number): string {
  return cn(
    "h-full rounded-full",
    maxScore >= 80 && "bg-gradient-to-r from-red-500 to-red-400",
    maxScore >= 50 && maxScore < 80 && "bg-gradient-to-r from-yellow-500 to-yellow-400",
    maxScore < 50 && "bg-gradient-to-r from-green-500 to-green-400"
  );
}

