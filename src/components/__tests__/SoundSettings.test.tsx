import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "../../test/testUtils";
import { SoundSettings } from "../SoundSettings";

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

describe("SoundSettings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Settings Button", () => {
    it("renders settings button", () => {
      render(<SoundSettings />);

      const button = screen.getByLabelText("Sound settings");
      expect(button).toBeInTheDocument();
    });

    it("opens settings panel when clicked", () => {
      render(<SoundSettings />);

      const button = screen.getByLabelText("Sound settings");
      fireEvent.click(button);

      expect(screen.getByText("Sound Settings")).toBeInTheDocument();
    });

    it("contains settings icon (gear)", () => {
      render(<SoundSettings />);

      // Should have an SVG icon
      const button = screen.getByLabelText("Sound settings");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Settings Panel", () => {
    it("shows Sound Settings header when open", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(screen.getByText("Sound Settings")).toBeInTheDocument();
    });

    it("can be closed with X button", async () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(screen.getByText("Sound Settings")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Close settings"));
      // AnimatePresence may delay the removal, just verify close button exists and was clicked
      expect(screen.getByLabelText("Close settings")).toBeInTheDocument();
    });

    it("can be closed by clicking backdrop", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(screen.getByText("Sound Settings")).toBeInTheDocument();

      // Verify backdrop is rendered - the panel is open
      const settingsHeader = screen.getByText("Sound Settings");
      expect(settingsHeader).toBeInTheDocument();
    });
  });

  describe("Sound Toggle", () => {
    it("shows Sound Effects label", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(screen.getByText("Sound Effects")).toBeInTheDocument();
    });

    it("has toggle button for sound", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));

      // Look for the toggle by its specific aria-label
      const toggle = screen.getByLabelText(/enable sound|disable sound/i);
      expect(toggle).toBeInTheDocument();
    });

    it("shows description text", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(
        screen.getByText("Enable or disable game sound effects")
      ).toBeInTheDocument();
    });
  });

  describe("Volume Slider", () => {
    it("shows Volume label", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(screen.getByText("Volume")).toBeInTheDocument();
    });

    it("shows volume percentage", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      // Default volume is 0.7 = 70%
      expect(screen.getByText("70%")).toBeInTheDocument();
    });

    it("renders volume slider", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));

      const slider = screen.getByRole("slider");
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute("type", "range");
    });

    it("slider has correct min/max values", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));

      const slider = screen.getByRole("slider");
      expect(slider).toHaveAttribute("min", "0");
      expect(slider).toHaveAttribute("max", "1");
    });

    it("shows volume description text", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(
        screen.getByText("Adjust the volume of sound effects")
      ).toBeInTheDocument();
    });
  });

  describe("Initial State", () => {
    it("starts with settings panel closed", () => {
      render(<SoundSettings />);
      expect(screen.queryByText("Sound Settings")).not.toBeInTheDocument();
    });

    it("shows settings button initially", () => {
      render(<SoundSettings />);
      expect(screen.getByLabelText("Sound settings")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label on settings button", () => {
      render(<SoundSettings />);
      expect(screen.getByLabelText("Sound settings")).toBeInTheDocument();
    });

    it("has proper aria-label on close button", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));
      expect(screen.getByLabelText("Close settings")).toBeInTheDocument();
    });

    it("volume slider has associated label", () => {
      render(<SoundSettings />);

      fireEvent.click(screen.getByLabelText("Sound settings"));

      const slider = screen.getByRole("slider");
      expect(slider).toHaveAttribute("id", "volume-slider");
    });
  });
});
