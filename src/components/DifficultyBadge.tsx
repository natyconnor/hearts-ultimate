import { cn } from "../lib/utils";
import type { AIDifficulty } from "../types/game";

interface DifficultyBadgeProps {
  difficulty: AIDifficulty | undefined;
  size?: "sm" | "md";
  className?: string;
}

const DIFFICULTY_BADGES = {
  easy: {
    icon: "🌱",
    label: "Easy",
    color: "bg-green-500/20 border-green-500/40 text-green-200",
  },
  medium: {
    icon: "⚡",
    label: "Medium",
    color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-200",
  },
  hard: {
    icon: "🧠",
    label: "Hard",
    color: "bg-purple-500/20 border-purple-500/40 text-purple-200",
  },
} as const;

export function getDifficultyBadgeInfo(difficulty: AIDifficulty | undefined) {
  if (!difficulty) return null;
  return DIFFICULTY_BADGES[difficulty];
}

export function DifficultyBadge({
  difficulty,
  size = "sm",
  className,
}: DifficultyBadgeProps) {
  const badge = getDifficultyBadgeInfo(difficulty);
  if (!badge) return null;

  const sizeClasses = {
    sm: "gap-1 px-1.5 py-0.5 text-[10px]",
    md: "gap-1.5 px-2 py-0.5 text-xs",
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-full font-medium backdrop-blur-sm border shadow-lg",
        badge.color,
        sizeClasses[size],
        className
      )}
      title={badge.label}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </div>
  );
}

// Icon-only variant for compact displays
export function DifficultyBadgeIcon({
  difficulty,
  className,
}: {
  difficulty: AIDifficulty | undefined;
  className?: string;
}) {
  const badge = getDifficultyBadgeInfo(difficulty);
  if (!badge) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm border",
        badge.color,
        className
      )}
      title={badge.label}
    >
      <span>{badge.icon}</span>
    </div>
  );
}
