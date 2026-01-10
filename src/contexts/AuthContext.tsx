import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";
import { AuthContext, type UserStats } from "./authContextDef";

// Re-export types for convenience
export type { UserStats } from "./authContextDef";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Fetch user stats
  const refreshStats = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_stats")
      .select("games_played, games_won, total_points_taken, moons_shot")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setStats(data);
    }
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsLoading(false);
      } else {
        // Silently sign in anonymously - user doesn't see anything
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (!error && data.user) {
            setUser(data.user);
          }
          setIsLoading(false);
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch stats when user changes
  useEffect(() => {
    if (user) {
      refreshStats();
    } else {
      setStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isAnonymous = user?.is_anonymous ?? true;

  const linkWithEmail = async (email: string, password: string) => {
    if (!user?.is_anonymous) {
      throw new Error("Account is already linked");
    }

    // Try to update the anonymous user with email/password
    // This links the account without requiring email confirmation
    const { error: updateError } = await supabase.auth.updateUser({
      email,
      password,
    });

    if (updateError) {
      // If updateUser fails (e.g., email already exists), try signUp which links automatically
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
    }

    // Refresh user to get updated state
    const {
      data: { user: updatedUser },
    } = await supabase.auth.getUser();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const linkWithOAuth = async (provider: "google" | "github") => {
    if (!user?.is_anonymous) {
      throw new Error("Account is already linked");
    }

    // Sign in with OAuth - Supabase will automatically link to the anonymous account
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });

    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAnonymous,
        stats,
        refreshStats,
        linkWithEmail,
        linkWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
