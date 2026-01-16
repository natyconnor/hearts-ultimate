import { type ReactNode, useCallback, useState, useEffect } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { AuthContext, type UserStats } from "./authContextDef";
import { getLocalStats, clearLocalStats } from "../lib/localStats";

// Re-export types for convenience
export type { UserStats } from "./authContextDef";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const migrateStatsMutation = useMutation(api.stats.migrateLocalStats);

  // Local stats for anonymous users (reactive via state)
  const [localStats, setLocalStats] = useState<UserStats | null>(null);

  // Refresh local stats periodically and on mount
  useEffect(() => {
    const updateLocalStats = () => {
      if (!isAuthenticated) {
        setLocalStats(getLocalStats());
      }
    };

    updateLocalStats();

    // Listen for storage changes (in case another tab updates stats)
    window.addEventListener("storage", updateLocalStats);
    return () => window.removeEventListener("storage", updateLocalStats);
  }, [isAuthenticated]);

  // Fetch stats for authenticated user
  const convexStats = useQuery(
    api.stats.getMyStats,
    isAuthenticated ? {} : "skip"
  );

  // Migrate local stats when user signs in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const local = getLocalStats();
      if (local && local.gamesPlayed > 0) {
        // Migrate local stats to user's account
        migrateStatsMutation({
          gamesPlayed: local.gamesPlayed,
          gamesWon: local.gamesWon,
          totalPointsTaken: local.totalPointsTaken,
          moonsShot: local.moonsShot,
        }).then(() => {
          clearLocalStats();
          setLocalStats(null);
        }).catch((err) => {
          console.warn("Failed to migrate local stats:", err);
        });
      }
    }
  }, [isAuthenticated, isLoading, migrateStatsMutation]);

  // Use Convex stats for authenticated users, local stats for anonymous
  const stats: UserStats | null = isAuthenticated
    ? convexStats
      ? {
          gamesPlayed: convexStats.gamesPlayed,
          gamesWon: convexStats.gamesWon,
          totalPointsTaken: convexStats.totalPointsTaken,
          moonsShot: convexStats.moonsShot,
        }
      : null
    : localStats;

  // Manual refresh for local stats (Convex auto-refreshes)
  const refreshStats = useCallback(() => {
    if (!isAuthenticated) {
      setLocalStats(getLocalStats());
    }
  }, [isAuthenticated]);

  const signIn = useCallback(async (email: string, password: string) => {
    await convexSignIn("password", { email, password, flow: "signIn" });
  }, [convexSignIn]);

  const signUp = useCallback(async (email: string, password: string) => {
    await convexSignIn("password", { email, password, flow: "signUp" });
  }, [convexSignIn]);

  const signOut = useCallback(async () => {
    await convexSignOut();
  }, [convexSignOut]);

  const isAnonymous = !isAuthenticated;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isAnonymous,
        stats,
        refreshStats,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
