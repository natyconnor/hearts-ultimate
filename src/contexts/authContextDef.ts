import { createContext } from "react";

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalPointsTaken: number;
  moonsShot: number;
}

export interface AuthContextType {
  /** True if user is authenticated via Convex Auth */
  isAuthenticated: boolean;
  /** True while checking session on initial load */
  isLoading: boolean;
  /** True if user hasn't signed in yet (playing anonymously) */
  isAnonymous: boolean;
  /** User's game statistics */
  stats: UserStats | null;
  /** Refresh stats from database */
  refreshStats: () => void;
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email/password */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
