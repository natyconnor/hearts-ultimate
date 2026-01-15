import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    // Email/password authentication
    Password,
    // Note: Add OAuth providers here if needed later:
    // GitHub,
    // Google,
  ],
});
