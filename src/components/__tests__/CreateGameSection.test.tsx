import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/testUtils";
import { CreateGameSection } from "../CreateGameSection";

describe("CreateGameSection Component", () => {
  const defaultProps = {
    onCreateGame: vi.fn(),
    onCreateTestRoom: vi.fn(),
    onJoinRoom: vi.fn(),
    isCreatingRoom: false,
    isCreatingTestRoom: false,
    isJoiningRoom: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Game Button", () => {
    it("renders create game button", () => {
      render(<CreateGameSection {...defaultProps} />);
      expect(screen.getByText("Create Game")).toBeInTheDocument();
    });

    it("calls onCreateGame when clicked", () => {
      render(<CreateGameSection {...defaultProps} />);
      const button = screen.getByText("Create Game");
      fireEvent.click(button);
      expect(defaultProps.onCreateGame).toHaveBeenCalledTimes(1);
    });

    it("shows loading state when creating room", () => {
      render(<CreateGameSection {...defaultProps} isCreatingRoom={true} />);
      expect(screen.getByText("Creating Room...")).toBeInTheDocument();
      expect(screen.queryByText("Create Game")).not.toBeInTheDocument();
    });

    it("disables button when creating room", () => {
      render(<CreateGameSection {...defaultProps} isCreatingRoom={true} />);
      const button = screen.getByText("Creating Room...").closest("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Join Room Functionality", () => {
    it("renders join room button initially", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });
    });

    it("shows input field when join button is clicked", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Enter room code")
        ).toBeInTheDocument();
        expect(screen.getByText("Join")).toBeInTheDocument();
      });
    });

    it("allows typing in the join input field", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter room code");
        fireEvent.change(input, { target: { value: "test-room-123" } });
        expect(input).toHaveValue("test-room-123");
      });
    });

    it("calls onJoinRoom with slug when join button is clicked", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter room code");
        fireEvent.change(input, { target: { value: "test-room-123" } });
      });

      const submitButton = screen.getByText("Join");
      fireEvent.click(submitButton);

      expect(defaultProps.onJoinRoom).toHaveBeenCalledWith("test-room-123");
    });

    it("calls onJoinRoom when Enter key is pressed", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter room code");
        fireEvent.change(input, { target: { value: "test-room-456" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(defaultProps.onJoinRoom).toHaveBeenCalledWith("test-room-456");
    });

    it("closes input when Escape key is pressed", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter room code");
        fireEvent.keyDown(input, { key: "Escape" });
      });

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Enter room code")
        ).not.toBeInTheDocument();
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });
    });

    it("closes input when cancel button is clicked", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const cancelButton = screen.getByText("✕");
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Enter room code")
        ).not.toBeInTheDocument();
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });
    });

    it("trims whitespace from slug before joining", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter room code");
        fireEvent.change(input, { target: { value: "  test-room-789  " } });
      });

      const submitButton = screen.getByText("Join");
      fireEvent.click(submitButton);

      expect(defaultProps.onJoinRoom).toHaveBeenCalledWith("test-room-789");
    });

    it("does not call onJoinRoom with empty slug", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const submitButton = screen.getByText("Join");
        expect(submitButton).toBeDisabled();
      });
    });

    it("shows loading state when joining room", async () => {
      render(<CreateGameSection {...defaultProps} isJoiningRoom={true} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      // When isJoiningRoom is true, the button should be disabled
      const joinButton = screen.getByText("Join Room").closest("button");
      expect(joinButton).toBeDisabled();
    });

    it("resets input after successful join", async () => {
      render(<CreateGameSection {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText("Join Room")).toBeInTheDocument();
      });

      const joinButton = screen.getByText("Join Room").closest("button");
      if (joinButton) {
        fireEvent.click(joinButton);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText("Enter room code");
        fireEvent.change(input, { target: { value: "test-room-123" } });
      });

      const submitButton = screen.getByText("Join");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Enter room code")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Test Room Functionality", () => {
    it("renders test mode button", () => {
      render(<CreateGameSection {...defaultProps} />);
      expect(screen.getByText(/Test Mode/)).toBeInTheDocument();
    });

    it("shows test difficulty dropdown", () => {
      render(<CreateGameSection {...defaultProps} />);
      expect(screen.getByText(/AI Level:/)).toBeInTheDocument();
    });

    it("calls onCreateTestRoom when test button is clicked", () => {
      render(<CreateGameSection {...defaultProps} />);
      const testButton = screen.getByText(/Test Mode/);
      fireEvent.click(testButton);
      expect(defaultProps.onCreateTestRoom).toHaveBeenCalledWith("medium");
    });
  });

  describe("Error Handling", () => {
    it("displays error message when error is present", () => {
      const error = new Error("Failed to create room");
      render(<CreateGameSection {...defaultProps} error={error} />);
      expect(screen.getByText("Failed to create room")).toBeInTheDocument();
    });

    it("displays join room error message", () => {
      const error = new Error("Room not found");
      render(<CreateGameSection {...defaultProps} error={error} />);
      expect(screen.getByText("Room not found")).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("disables join button when creating room", async () => {
      render(<CreateGameSection {...defaultProps} isCreatingRoom={true} />);
      await waitFor(() => {
        const joinButton = screen.getByText("Join Room").closest("button");
        expect(joinButton).toBeDisabled();
      });
    });

    it("disables create button when joining room", async () => {
      render(<CreateGameSection {...defaultProps} isJoiningRoom={true} />);
      await waitFor(() => {
        const createButton = screen.getByText("Create Game").closest("button");
        expect(createButton).toBeDisabled();
      });
    });

    it("disables join button when joining room", async () => {
      render(<CreateGameSection {...defaultProps} isJoiningRoom={true} />);
      await waitFor(() => {
        const joinButton = screen.getByText("Join Room").closest("button");
        expect(joinButton).toBeDisabled();
      });
    });
  });
});
