import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Github } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { buttonClasses } from "../lib/styles";
import { cn } from "../lib/utils";

interface AccountLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountLinkModal({ isOpen, onClose }: AccountLinkModalProps) {
  const { linkWithEmail, linkWithOAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await linkWithEmail(email, password);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setIsLoading(true);
    try {
      await linkWithOAuth(provider);
      // OAuth redirects away, so we don't need to handle success here
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link account");
      setIsLoading(false);
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
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 p-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {success ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Account Created!
                  </h2>
                  <p className="text-white/60">
                    Your stats are now saved across devices.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Save Your Stats
                  </h2>
                  <p className="text-white/60 mb-6 text-sm">
                    Create an account to keep your stats across devices and
                    sessions.
                  </p>

                  {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Email form */}
                  <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-white/80 mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-white/80 mb-1"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                        className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                        placeholder="At least 6 characters"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-white/80 mb-1"
                      >
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        minLength={6}
                        className="w-full px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                        placeholder="Confirm your password"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={cn(
                        buttonClasses("primary"),
                        "w-full flex items-center justify-center gap-2"
                      )}
                    >
                      <Mail className="w-4 h-4" />
                      {isLoading ? "Creating..." : "Create Account"}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-slate-800 text-white/60">
                        Or sign in with
                      </span>
                    </div>
                  </div>

                  {/* OAuth buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleOAuth("google")}
                      disabled={isLoading}
                      className={cn(
                        buttonClasses("secondary"),
                        "w-full flex items-center justify-center gap-2"
                      )}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      onClick={() => handleOAuth("github")}
                      disabled={isLoading}
                      className={cn(
                        buttonClasses("secondary"),
                        "w-full flex items-center justify-center gap-2"
                      )}
                    >
                      <Github className="w-4 h-4" />
                      Continue with GitHub
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
