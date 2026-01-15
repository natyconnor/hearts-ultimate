import { type ReactNode, useCallback } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { AuthContext, type UserStats } from "./authContextDef";

// Re-export types for convenience
export type { UserStats } from "./authContextDef";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  // Fetch stats for authenticated user
  const convexStats = useQuery(
    api.stats.getMyStats,
    isAuthenticated ? {} : "skip"
  );

  // Convert Convex stats to our format
  const stats: UserStats | null = convexStats ? {
    gamesPlayed: convexStats.gamesPlayed,
    gamesWon: convexStats.gamesWon,
    totalPointsTaken: convexStats.totalPointsTaken,
    moonsShot: convexStats.moonsShot,
  } : null;

  // Stats refresh is automatic with Convex reactive queries
  const refreshStats = useCallback(() => {
    // No-op - Convex queries are automatically reactive
  }, []);

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
