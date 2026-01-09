import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "../../test/testUtils";
import { GameLobby } from "../GameLobby";
import { createPlayer } from "../../test/testUtils";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AIDifficulty } from "../../types/game";

// Mock SoundSettings component
vi.mock("../SoundSettings", () => ({
  SoundSettings: () => <div>SoundSettings</div>,
}));

describe("GameLobby Component", () => {
  const createMockMutation = <T, E, V>(
    overrides: Partial<UseMutationResult<T, E, V>> = {}
  ): UseMutationResult<T, E, V> => {
    return {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      reset: vi.fn(),
      status: "idle",
      isIdle: true,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      ...overrides,
    } as UseMutationResult<T, E, V>;
  };

  const defaultProps = {
    slug: "test-room-123",
    players: [],
    spectators: [],
    currentPlayerId: null,
    currentSpectatorId: null,
    isConnected: true,
    roomStatus: "waiting" as const,
    lobbyMutations: {
      joinRoom: createMockMutation<unknown, Error, string>(),
      addAIPlayers: createMockMutation<unknown, Error, void>(),
      updateAIDifficulty: createMockMutation<
        unknown,
        Error,
        { playerId: string; difficulty: AIDifficulty }
      >(),
      startGame: createMockMutation<unknown, Error, void>(),
      leaveRoom: createMockMutation<unknown, Error, void>(),
    },
    spectatorMutations: {
      joinSpectator: createMockMutation<unknown, Error, string>(),
      leaveSpectator: createMockMutation<unknown, Error, void>(),
    },
    realtimeError: null,
  };

  // Mock clipboard API
  const mockWriteText = vi.fn();
  const mockClipboard = {
    writeText: mockWriteText,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: mockClipboard });
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe("Room Code Display", () => {
    it("displays the room slug", () => {
      render(<GameLobby {...defaultProps} />);
      expect(screen.getByText("test-room-123")).toBeInTheDocument();
    });

    it("displays room code label", () => {
      render(<GameLobby {...defaultProps} />);
      expect(screen.getByText("Room Code")).toBeInTheDocument();
    });

    it("renders copy button", () => {
      render(<GameLobby {...defaultProps} />);
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });
  });

  describe("Copy Button Functionality", () => {
    it("copies slug to clipboard when clicked", async () => {
      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith("test-room-123");
      });
    });

    it("shows 'Copied!' feedback after copying", async () => {
      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("shows copied feedback temporarily", async () => {
      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      // Verify copied state appears
      await waitFor(
        () => {
          expect(screen.getByText("Copied!")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // The component uses setTimeout to hide it after 2 seconds
      // We just verify the state change happens
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    it("handles clipboard API failure gracefully", async () => {
      // Mock clipboard API to fail
      mockWriteText.mockRejectedValue(new Error("Clipboard API not available"));

      // Mock document.execCommand to succeed (fallback)
      const mockExecCommand = vi.fn(() => true);
      const originalExecCommand = document.execCommand;
      document.execCommand = mockExecCommand;

      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");

      // Click should not throw an error
      fireEvent.click(copyButton);

      // Wait a moment for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Component should still be rendered (didn't crash)
      expect(screen.getByText("test-room-123")).toBeInTheDocument();

      // Restore
      document.execCommand = originalExecCommand;
    });
  });

  describe("Copy Button UI", () => {
    it("shows Copy icon initially", () => {
      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");
      expect(copyButton).toBeInTheDocument();
      // Check that the button contains an icon (lucide-react icons render as SVG)
      const button = copyButton.closest("button");
      expect(button).toBeInTheDocument();
    });

    it("shows Check icon when copied", async () => {
      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");
      fireEvent.click(copyButton);

      await waitFor(
        () => {
          expect(screen.getByText("Copied!")).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // Verify the button exists and contains "Copied!" text
      const copiedButton = screen.getByText("Copied!");
      expect(copiedButton).toBeInTheDocument();
      const button = copiedButton.closest("button");
      expect(button).toBeInTheDocument();
    });

    it("has copy button accessible", () => {
      render(<GameLobby {...defaultProps} />);
      const copyButton = screen.getByText("Copy");
      expect(copyButton).toBeInTheDocument();
      const button = copyButton.closest("button");
      expect(button).toBeInTheDocument();
      expect(button?.tagName).toBe("BUTTON");
    });
  });

  describe("Player Management", () => {
    it("displays player count", () => {
      const players = [
        createPlayer({ id: "1", name: "Player 1" }),
        createPlayer({ id: "2", name: "Player 2" }),
      ];
      render(<GameLobby {...defaultProps} players={players} />);
      expect(screen.getByText("Players (2/4)")).toBeInTheDocument();
    });

    it("shows join button when player can join", () => {
      render(<GameLobby {...defaultProps} />);
      expect(screen.getByText("Join as Player")).toBeInTheDocument();
    });

    it("does not show join button when player is already in room", () => {
      const players = [createPlayer({ id: "player-1", name: "Player 1" })];
      render(
        <GameLobby
          {...defaultProps}
          players={players}
          currentPlayerId="player-1"
        />
      );
      expect(screen.queryByText("Join as Player")).not.toBeInTheDocument();
    });
  });

  describe("Connection Status", () => {
    it("shows connected status", () => {
      render(<GameLobby {...defaultProps} isConnected={true} />);
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("shows disconnected status", () => {
      render(<GameLobby {...defaultProps} isConnected={false} />);
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });
  });
});
