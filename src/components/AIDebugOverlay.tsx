import { useAIDebugStore } from "../store/aiDebugStore";
import { formatCard } from "../game/cardDisplay";
import { cn } from "../lib/utils";
import { AI_VERSION } from "../lib/ai/types";
import {
  X,
  ChevronDown,
  ChevronRight,
  Activity,
  Brain,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { AIDebugLog } from "../store/aiDebugStore";

export function AIDebugOverlay() {
  const { logs, isOpen, toggleOpen, clearLogs } = useAIDebugStore();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyLogs = async () => {
    const text = formatLogsForLLM(logs);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-4 left-4 z-50 p-3 bg-slate-900/90 text-emerald-400 rounded-full shadow-lg border border-emerald-500/30 hover:bg-slate-800 transition-colors"
        title="AI Debugger"
      >
        <Brain className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 left-4 bottom-4 w-96 z-50 bg-slate-900/95 backdrop-blur-md border-r border-slate-700 shadow-2xl flex flex-col rounded-r-xl overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
        <div className="flex items-center gap-2 text-emerald-400">
          <Activity className="w-4 h-4" />
          <div className="flex flex-col">
            <h2 className="font-bold text-sm uppercase tracking-wider">
              AI Logic Inspector
            </h2>
            <span className="text-[10px] text-slate-400 font-normal">
              AI Version {AI_VERSION}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLogs}
            className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 text-xs flex items-center gap-1"
            title="Copy logs for LLM analysis"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={clearLogs}
            className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 text-xs"
          >
            Clear
          </button>
          <button
            onClick={toggleOpen}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">
            Waiting for AI actions...
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log) => (
              <LogItem
                key={log.id}
                log={log}
                isExpanded={expandedLogId === log.id}
                onToggle={() =>
                  setExpandedLogId(expandedLogId === log.id ? null : log.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogItem({
  log,
  isExpanded,
  onToggle,
}: {
  log: AIDebugLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isPlay = log.actionType === "play";
  const decisionText = Array.isArray(log.decision)
    ? log.decision.map(formatCard).join(", ")
    : formatCard(log.decision);

  return (
    <div className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
      <div
        className="p-3 cursor-pointer flex items-start gap-2"
        onClick={onToggle}
      >
        <div className="mt-0.5 text-slate-500">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold text-slate-200">{log.playerName}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] uppercase font-bold",
                log.difficulty === "hard"
                  ? "bg-purple-900 text-purple-300"
                  : log.difficulty === "medium"
                  ? "bg-blue-900 text-blue-300"
                  : "bg-green-900 text-green-300"
              )}
            >
              {log.difficulty}
            </span>
          </div>
          <div className="text-slate-400 mb-1 flex justify-between">
            <span>
              {isPlay ? "Played" : "Passed"}:{" "}
              <span className="text-white font-bold">{decisionText}</span>
            </span>
            <span className="opacity-50 text-[10px] mt-0.5">
              R{log.roundNumber}
            </span>
          </div>
          {log.contextInfo && (
            <div className="text-slate-500 italic">{log.contextInfo}</div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 pl-8 text-slate-300 border-t border-slate-800/50 bg-slate-950/30">
          {/* Alternatives Table */}
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
              Scoring Analysis
            </h4>
            <div className="space-y-1">
              {log.consideredCards.slice(0, 5).map((scored, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "grid grid-cols-[40px_40px_1fr] gap-2 items-center text-[11px]",
                    idx === 0 ? "text-emerald-300" : "text-slate-400"
                  )}
                >
                  <span className="font-bold">{formatCard(scored.card)}</span>
                  <span className="text-right font-mono">{scored.score}</span>
                  <span className="truncate opacity-80">
                    {scored.reasons?.join(", ") || "-"}
                  </span>
                </div>
              ))}
              {log.consideredCards.length > 5 && (
                <div className="text-slate-600 text-[10px] pl-20">
                  ...and {log.consideredCards.length - 5} more
                </div>
              )}
            </div>
          </div>

          {/* Memory Snapshot (Hard AI) */}
          {log.memorySnapshot && (
            <div className="mb-2">
              <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                Memory State
              </h4>
              <div className="text-[10px] space-y-1 text-slate-400">
                {log.memorySnapshot.aggressiveness !== undefined && (
                  <div className="text-amber-400">
                    Aggro:{" "}
                    {(log.memorySnapshot.aggressiveness * 100).toFixed(0)}%
                    {log.memorySnapshot.baseAggressiveness !== undefined && (
                      <span className="text-slate-500">
                        {" "}
                        (base:{" "}
                        {(log.memorySnapshot.baseAggressiveness * 100).toFixed(
                          0
                        )}
                        %)
                      </span>
                    )}
                  </div>
                )}
                <div>
                  Remembered: {log.memorySnapshot.cardsRememberedCount} cards
                </div>
                {log.memorySnapshot.moonShooterCandidate && (
                  <div className="text-red-400">
                    Suspect Moon: {log.memorySnapshot.moonShooterCandidate}
                  </div>
                )}
                {log.memorySnapshot.voidSuits &&
                  Object.keys(log.memorySnapshot.voidSuits).length > 0 && (
                    <div className="mt-1">
                      <div className="mb-0.5 opacity-70">Known Voids:</div>
                      {Object.entries(log.memorySnapshot.voidSuits).map(
                        ([pid, suits]) => (
                          <div key={pid} className="pl-2">
                            {pid.substring(0, 8)}: {suits.join(", ")}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Formats logs into a token-efficient text format for LLM analysis
 */
function formatLogsForLLM(logs: AIDebugLog[]): string {
  // Get AI version from logs (should be consistent, but use first log's version)
  const aiVersion = logs.length > 0 ? logs[0].aiVersion : AI_VERSION;

  const header = `HEARTS AI GAME LOGS
Generated: ${new Date().toISOString()}
AI Version: ${aiVersion}
Format: [Round|Player|Diff|Action] Context -> Decision | (Alternatives...) | {Memory}
--------------------------------------------------------------------------------`;

  const logLines = logs
    .slice()
    .reverse() // Logs are stored newest-first, flip to chronological for reading
    .map((log) => {
      const decision = Array.isArray(log.decision)
        ? log.decision.map(formatCard).join(",")
        : formatCard(log.decision);

      const alternatives = log.consideredCards
        .slice(0, 3) // Top 3 alternatives only
        .map(
          (c) =>
            `${formatCard(c.card)}=${c.score}${
              c.reasons?.length ? `(${c.reasons[0]})` : ""
            }`
        )
        .join(", ");

      const memory = log.memorySnapshot
        ? `{Mem:${log.memorySnapshot.cardsRememberedCount}${
            log.memorySnapshot.aggressiveness !== undefined
              ? `|Aggro:${(log.memorySnapshot.aggressiveness * 100).toFixed(
                  0
                )}%`
              : ""
          }${
            log.memorySnapshot.moonShooterCandidate
              ? `|Moon:${log.memorySnapshot.moonShooterCandidate}`
              : ""
          }}`
        : "";

      return `[R${log.roundNumber}|${log.playerName}|${log.difficulty}|${
        log.actionType
      }] ${
        log.contextInfo || ""
      } -> **${decision}** | Alt: [${alternatives}] ${memory}`;
    });

  return [header, ...logLines].join("\n");
}
