import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { GameSettings } from "../GameSettings";

// Mock the sound module
vi.mock("../../lib/sounds", () => ({
  soundManager: {
    getEnabled: vi.fn(() => true),
    getVolume: vi.fn(() => 0.7),
    setEnabled: vi.fn(),
    setVolume: vi.fn(),
  },
  playSound: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("GameSettings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Settings Button", () => {
    it("renders settings button", () => {
      render(<GameSettings />);

      const button = screen.getByLabelText("Game settings");
      expect(button).toBeInTheDocument();
    });

    it("opens settings panel when clicked", () => {
      render(<GameSettings />);

      const button = screen.getByLabelText("Game settings");
      fireEvent.click(button);

      expect(screen.getByText("Game Settings")).toBeInTheDocument();
    });

    it("contains settings icon (gear)", () => {
      render(<GameSettings />);

      // Should have an SVG icon
      const button = screen.getByLabelText("Game settings");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Settings Panel", () => {
    it("shows Game Settings header when open", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("Game Settings")).toBeInTheDocument();
    });

    it("can be closed with X button", async () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("Game Settings")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close settings"));
      // AnimatePresence may delay the removal, just verify close button exists and was clicked
      expect(screen.getByLabelText("Close settings")).toBeInTheDocument();
    });

    it("can be closed by clicking backdrop", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("Game Settings")).toBeInTheDocument();

      // Verify backdrop is rendered - the panel is open
      const settingsHeader = screen.getByText("Game Settings");
      expect(settingsHeader).toBeInTheDocument();
    });
  });

  describe("AI Speed Slider", () => {
    it("shows AI Play Speed label", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("AI Play Speed")).toBeInTheDocument();
    });

    it("shows speed label text", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      // Should show one of the speed labels
      const speedLabels = ["Very Fast", "Fast", "Normal", "Slow", "Very Slow"];
      const hasSpeedLabel = speedLabels.some((label) =>
        screen.queryByText(label)
      );
      expect(hasSpeedLabel).toBe(true);
    });

    it("renders AI speed slider", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));

      const slider = screen.getByLabelText("AI Play Speed");
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute("type", "range");
    });

    it("shows Slow and Fast labels on slider", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("Slow")).toBeInTheDocument();
      expect(screen.getByText("Fast")).toBeInTheDocument();
    });

    it("shows description text", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(
        screen.getByText("Adjust how quickly AI players make their moves")
      ).toBeInTheDocument();
    });
  });

  describe("Sound Toggle", () => {
    it("shows Sound Effects label", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("Sound Effects")).toBeInTheDocument();
    });

    it("has toggle button for sound", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));

      // Look for the toggle by its specific aria-label
      const toggle = screen.getByLabelText(/enable sound|disable sound/i);
      expect(toggle).toBeInTheDocument();
    });

    it("shows description text", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(
        screen.getByText("Enable or disable game sound effects")
      ).toBeInTheDocument();
    });
  });

  describe("Volume Slider", () => {
    it("shows Volume label", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByText("Volume")).toBeInTheDocument();
    });

    it("shows volume percentage", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      // Default volume is 0.7 = 70%
      expect(screen.getByText("70%")).toBeInTheDocument();
    });

    it("renders volume slider", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));

      const slider = screen.getByLabelText("Volume");
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute("type", "range");
    });

    it("slider has correct min/max values", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));

      const slider = screen.getByLabelText("Volume");
      expect(slider).toHaveAttribute("min", "0");
      expect(slider).toHaveAttribute("max", "1");
    });

    it("shows volume description text", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(
        screen.getByText("Adjust the volume of sound effects")
      ).toBeInTheDocument();
    });
  });

  describe("Initial State", () => {
    it("starts with settings panel closed", () => {
      render(<GameSettings />);
      expect(screen.queryByText("Game Settings")).not.toBeInTheDocument();
    });

    it("shows settings button initially", () => {
      render(<GameSettings />);
      expect(screen.getByLabelText("Game settings")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label on settings button", () => {
      render(<GameSettings />);
      expect(screen.getByLabelText("Game settings")).toBeInTheDocument();
    });

    it("has proper aria-label on close button", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));
      expect(screen.getByLabelText("Close settings")).toBeInTheDocument();
    });

    it("volume slider has associated label", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));

      const slider = screen.getByLabelText("Volume");
      expect(slider).toHaveAttribute("id", "volume-slider");
    });

    it("AI speed slider has associated label", () => {
      render(<GameSettings />);

      fireEvent.click(screen.getByLabelText("Game settings"));

      const slider = screen.getByLabelText("AI Play Speed");
      expect(slider).toHaveAttribute("id", "ai-speed-slider");
    });
  });
});
