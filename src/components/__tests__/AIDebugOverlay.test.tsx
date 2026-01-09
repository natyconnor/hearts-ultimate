import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { AIDebugOverlay } from "../AIDebugOverlay";
import { useAIDebugStore } from "../../store/aiDebugStore";
import type { AIDebugLog } from "../../store/aiDebugStore";

// Mock the store
vi.mock("../../store/aiDebugStore", () => ({
  useAIDebugStore: vi.fn(),
}));

// Mock card display
vi.mock("../../game/cardDisplay", () => ({
  formatCard: (card: { suit: string; rank: number }) => `${card.rank}${card.suit[0].toUpperCase()}`,
}));

describe("AIDebugOverlay Component", () => {
  const mockToggleOpen = vi.fn();
  const mockClearLogs = vi.fn();

  const createMockLog = (overrides: Partial<AIDebugLog> = {}): AIDebugLog => ({
    id: "log-1",
    timestamp: Date.now(),
    playerName: "Bot Alice",
    difficulty: "hard",
    actionType: "play",
    decision: { suit: "hearts", rank: 5, points: 1 },
    consideredCards: [
      {
        card: { suit: "hearts", rank: 5, points: 1 },
        score: 85,
        reasons: ["Safe play"],
      },
      {
        card: { suit: "clubs", rank: 10, points: 0 },
        score: 60,
        reasons: ["Medium risk"],
      },
    ],
    roundNumber: 3,
    aiVersion: "1.0.0",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      logs: [],
      isOpen: false,
      toggleOpen: mockToggleOpen,
      clearLogs: mockClearLogs,
    });
  });

  describe("Closed State", () => {
    it("renders toggle button when closed", () => {
      render(<AIDebugOverlay />);

      const button = screen.getByTitle("AI Debugger");
      expect(button).toBeInTheDocument();
    });

    it("shows brain icon in toggle button", () => {
      const { container } = render(<AIDebugOverlay />);

      const button = screen.getByTitle("AI Debugger");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("calls toggleOpen when button clicked", () => {
      render(<AIDebugOverlay />);

      fireEvent.click(screen.getByTitle("AI Debugger"));
      expect(mockToggleOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe("Open State - Empty Logs", () => {
    beforeEach(() => {
      (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        logs: [],
        isOpen: true,
        toggleOpen: mockToggleOpen,
        clearLogs: mockClearLogs,
      });
    });

    it("renders the inspector panel header", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText("AI Logic Inspector")).toBeInTheDocument();
    });

    it("shows AI version", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText(/AI Version/)).toBeInTheDocument();
    });

    it("shows waiting message when no logs", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText("Waiting for AI actions...")).toBeInTheDocument();
    });

    it("has Clear button", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("has Copy button", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });

    it("calls clearLogs when Clear clicked", () => {
      render(<AIDebugOverlay />);

      fireEvent.click(screen.getByText("Clear"));
      expect(mockClearLogs).toHaveBeenCalledTimes(1);
    });

    it("can be closed with X button", () => {
      render(<AIDebugOverlay />);

      const closeButtons = screen.getAllByRole("button");
      const xButton = closeButtons.find(btn =>
        btn.querySelector('svg.w-4.h-4')
      );

      if (xButton) {
        fireEvent.click(xButton);
        expect(mockToggleOpen).toHaveBeenCalled();
      }
    });
  });

  describe("Open State - With Logs", () => {
    const mockLogs = [
      createMockLog({ id: "log-1", playerName: "Bot Alice", difficulty: "hard" }),
      createMockLog({ id: "log-2", playerName: "Bot Bob", difficulty: "medium" }),
      createMockLog({ id: "log-3", playerName: "Bot Carol", difficulty: "easy", actionType: "pass" }),
    ];

    beforeEach(() => {
      (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        logs: mockLogs,
        isOpen: true,
        toggleOpen: mockToggleOpen,
        clearLogs: mockClearLogs,
      });
    });

    it("displays log entries", () => {
      render(<AIDebugOverlay />);

      expect(screen.getByText("Bot Alice")).toBeInTheDocument();
      expect(screen.getByText("Bot Bob")).toBeInTheDocument();
      expect(screen.getByText("Bot Carol")).toBeInTheDocument();
    });

    it("shows difficulty badges", () => {
      render(<AIDebugOverlay />);

      expect(screen.getByText("hard")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
      expect(screen.getByText("easy")).toBeInTheDocument();
    });

    it("shows action type (Played/Passed)", () => {
      render(<AIDebugOverlay />);

      const playedTexts = screen.getAllByText(/Played:/);
      expect(playedTexts.length).toBeGreaterThan(0);

      const passedTexts = screen.getAllByText(/Passed:/);
      expect(passedTexts.length).toBeGreaterThan(0);
    });

    it("shows round number", () => {
      render(<AIDebugOverlay />);

      const roundIndicators = screen.getAllByText("R3");
      expect(roundIndicators.length).toBeGreaterThan(0);
    });

    it("does not show waiting message with logs", () => {
      render(<AIDebugOverlay />);
      expect(screen.queryByText("Waiting for AI actions...")).not.toBeInTheDocument();
    });
  });

  describe("Log Expansion", () => {
    const mockLog = createMockLog({
      contextInfo: "Leading trick, hearts not broken",
      memorySnapshot: {
        cardsRememberedCount: 15,
        moonShooterCandidate: "player-2",
        voidSuits: { "player-1": ["hearts", "diamonds"] },
      },
    });

    beforeEach(() => {
      (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        logs: [mockLog],
        isOpen: true,
        toggleOpen: mockToggleOpen,
        clearLogs: mockClearLogs,
      });
    });

    it("shows context info in collapsed view", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText("Leading trick, hearts not broken")).toBeInTheDocument();
    });

    it("expands log when clicked", () => {
      render(<AIDebugOverlay />);

      // Click on the log entry
      const logEntry = screen.getByText("Bot Alice").closest('[class*="cursor-pointer"]');
      if (logEntry) {
        fireEvent.click(logEntry);
      }

      // Should show scoring analysis
      expect(screen.getByText("Scoring Analysis")).toBeInTheDocument();
    });

    it("shows considered cards in expanded view", () => {
      render(<AIDebugOverlay />);

      const logEntry = screen.getByText("Bot Alice").closest('[class*="cursor-pointer"]');
      if (logEntry) {
        fireEvent.click(logEntry);
      }

      // Should show the score
      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("shows memory snapshot for hard AI", () => {
      render(<AIDebugOverlay />);

      const logEntry = screen.getByText("Bot Alice").closest('[class*="cursor-pointer"]');
      if (logEntry) {
        fireEvent.click(logEntry);
      }

      expect(screen.getByText("Memory State")).toBeInTheDocument();
      expect(screen.getByText(/Remembered: 15 cards/)).toBeInTheDocument();
    });

    it("shows moon shooter candidate in memory", () => {
      render(<AIDebugOverlay />);

      const logEntry = screen.getByText("Bot Alice").closest('[class*="cursor-pointer"]');
      if (logEntry) {
        fireEvent.click(logEntry);
      }

      expect(screen.getByText(/Suspect Moon/)).toBeInTheDocument();
    });

    it("shows void suits in memory", () => {
      render(<AIDebugOverlay />);

      const logEntry = screen.getByText("Bot Alice").closest('[class*="cursor-pointer"]');
      if (logEntry) {
        fireEvent.click(logEntry);
      }

      expect(screen.getByText("Known Voids:")).toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    beforeEach(() => {
      (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        logs: [createMockLog()],
        isOpen: true,
        toggleOpen: mockToggleOpen,
        clearLogs: mockClearLogs,
      });
    });

    it("copies logs to clipboard when Copy clicked", async () => {
      render(<AIDebugOverlay />);

      fireEvent.click(screen.getByText("Copy"));

      // Should have called clipboard.writeText
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it("shows Copied text after copying", async () => {
      render(<AIDebugOverlay />);

      fireEvent.click(screen.getByText("Copy"));

      // Wait for the "Copied" text to appear
      expect(await screen.findByText("Copied")).toBeInTheDocument();
    });
  });

  describe("Difficulty Color Coding", () => {
    beforeEach(() => {
      (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        logs: [
          createMockLog({ id: "1", difficulty: "hard" }),
          createMockLog({ id: "2", difficulty: "medium" }),
          createMockLog({ id: "3", difficulty: "easy" }),
        ],
        isOpen: true,
        toggleOpen: mockToggleOpen,
        clearLogs: mockClearLogs,
      });
    });

    it("uses purple for hard difficulty", () => {
      const { container } = render(<AIDebugOverlay />);
      expect(container.querySelector(".bg-purple-900")).toBeInTheDocument();
    });

    it("uses blue for medium difficulty", () => {
      const { container } = render(<AIDebugOverlay />);
      expect(container.querySelector(".bg-blue-900")).toBeInTheDocument();
    });

    it("uses green for easy difficulty", () => {
      const { container } = render(<AIDebugOverlay />);
      expect(container.querySelector(".bg-green-900")).toBeInTheDocument();
    });
  });

  describe("Pass Action", () => {
    beforeEach(() => {
      (useAIDebugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        logs: [
          createMockLog({
            actionType: "pass",
            decision: [
              { suit: "hearts", rank: 14, points: 1 },
              { suit: "spades", rank: 12, points: 13 },
              { suit: "clubs", rank: 5, points: 0 },
            ],
          }),
        ],
        isOpen: true,
        toggleOpen: mockToggleOpen,
        clearLogs: mockClearLogs,
      });
    });

    it("shows Passed label for pass actions", () => {
      render(<AIDebugOverlay />);
      expect(screen.getByText(/Passed:/)).toBeInTheDocument();
    });

    it("displays multiple cards for pass decision", () => {
      render(<AIDebugOverlay />);
      // The formatCard mock would return formatted cards
      // Verify the decision text is present
      expect(screen.getByText(/14H, 12S, 5C/)).toBeInTheDocument();
    });
  });
});
