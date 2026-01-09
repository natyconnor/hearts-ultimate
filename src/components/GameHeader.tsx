import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { SoundSettings } from "./SoundSettings";

interface GameHeaderProps {
  slug: string;
  isConnected: boolean;
  canLeave: boolean;
  isLeaving: boolean;
  onLeave: () => void;
}

export function GameHeader({
  slug,
  isConnected,
  canLeave,
  isLeaving,
  onLeave,
}: GameHeaderProps) {
  return (
    <header className="relative z-50 flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-white/10">
      <div className="w-full px-4 md:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <SoundSettings />
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-sm transition-all border border-white/20 hover:border-white/30 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-tight">
                {slug}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isConnected
                      ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                      : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
                  }`}
                />
                <span
                  className={`text-xs md:text-sm font-medium transition-colors ${
                    isConnected ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
          {canLeave && (
            <button
              onClick={onLeave}
              disabled={isLeaving}
              className="px-4 py-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLeaving ? "Leaving..." : "Leave Game"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
