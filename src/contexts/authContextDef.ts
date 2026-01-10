import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface UserStats {
  games_played: number;
  games_won: number;
  total_points_taken: number;
  moons_shot: number;
}

export interface AuthContextType {
  /** The current Supabase user (anonymous or linked) */
  user: User | null;
  /** True while checking/creating session on initial load */
  isLoading: boolean;
  /** True if user hasn't linked to email/OAuth yet */
  isAnonymous: boolean;
  /** User's game statistics */
  stats: UserStats | null;
  /** Refresh stats from database */
  refreshStats: () => Promise<void>;
  /** Link anonymous account to email/password */
  linkWithEmail: (email: string, password: string) => Promise<void>;
  /** Link anonymous account to OAuth provider (Google, GitHub, etc.) */
  linkWithOAuth: (provider: "google" | "github") => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
