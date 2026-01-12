import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, RefreshCw, UserX, Wifi, Users } from "lucide-react";
import { cn } from "../lib/utils";
import { STORAGE_KEYS } from "../lib/constants";
import { useGameStore } from "../store/gameStore";

interface GameEndedOverlayProps {
  endReason: "player_left" | "player_disconnected";
  playerName?: string;
  onGoToLobby?: () => void;
  isLoadingLobby?: boolean;
  /** Whether the current user is a player in the room */
  isPlayerInRoom?: boolean;
}

/**
 * Overlay shown when a game ends unexpectedly (player left or disconnected).
 * Provides options to go to lobby to reconfigure or go home.
 */
export function GameEndedOverlay({
  endReason,
  playerName,
  onGoToLobby,
  isLoadingLobby = false,
  isPlayerInRoom = false,
}: GameEndedOverlayProps) {
  const navigate = useNavigate();
  const { clearCurrentRoom } = useGameStore();

  const handleGoHome = () => {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    localStorage.removeItem(STORAGE_KEYS.SPECTATOR_ID);
    localStorage.removeItem(STORAGE_KEYS.SPECTATOR_NAME);
    clearCurrentRoom();
    navigate("/");
  };

  const isDisconnection = endReason === "player_disconnected";
  const Icon = isDisconnection ? Wifi : UserX;
  const title = isDisconnection ? "Player Disconnected" : "Player Left";
  const message = playerName
    ? isDisconnection
      ? `${playerName} lost connection and couldn't reconnect in time.`
      : `${playerName} left the game.`
    : isDisconnection
      ? "A player lost connection and couldn't reconnect in time."
      : "A player left the game.";

  const subtitle = isDisconnection
    ? "The game has ended. You can return to the lobby to add AI players and start a new game."
    : "The game has ended. You can return to the lobby to invite new players or add AI.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className={cn(
            "mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6",
            isDisconnection
              ? "bg-orange-500/20 text-orange-400"
              : "bg-red-500/20 text-red-400"
          )}
        >
          <Icon className="w-10 h-10" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold text-white text-center mb-2"
        >
          {title}
        </motion.h2>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-center mb-8"
        >
          {message}
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-gray-500 text-sm text-center mb-6"
        >
          {subtitle}
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3"
        >
          {isPlayerInRoom && onGoToLobby && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoToLobby}
              disabled={isLoadingLobby}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl",
                "font-semibold text-white",
                "bg-gradient-to-r from-blue-500 to-indigo-600",
                "shadow-lg hover:shadow-xl hover:shadow-blue-500/30",
                "transition-all cursor-pointer",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoadingLobby ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.span>
                  Loading...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Go to Lobby
                </>
              )}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoHome}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl",
              "font-semibold text-white",
              "bg-gray-700 hover:bg-gray-600",
              "shadow-lg hover:shadow-xl",
              "transition-all cursor-pointer"
            )}
          >
            <Home className="w-5 h-5" />
            Go Home
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
