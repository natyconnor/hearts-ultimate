import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AI_SPEED_RANGE, STORAGE_KEYS } from "../constants";
import { getStoredAISpeed } from "../settings";

describe("Settings Utilities", () => {
  describe("getStoredAISpeed", () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
      // Save original localStorage
      originalLocalStorage = window.localStorage;

      // Create a mock localStorage
      const mockStorage: Record<string, string> = {};
      const mockLocalStorage = {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        }),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });
    });

    afterEach(() => {
      // Restore original localStorage
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it("returns DEFAULT_SPEED when no value is stored", () => {
      expect(getStoredAISpeed()).toBe(AI_SPEED_RANGE.DEFAULT_SPEED);
      expect(localStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS.AI_PLAY_SPEED
      );
    });

    it("returns stored value when valid (0.3)", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("0.3");
      expect(getStoredAISpeed()).toBe(0.3);
    });

    it("returns stored value when valid (0)", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("0");
      expect(getStoredAISpeed()).toBe(0);
    });

    it("returns stored value when valid (1)", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("1");
      expect(getStoredAISpeed()).toBe(1);
    });

    it("returns stored value when valid (0.75)", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        "0.75"
      );
      expect(getStoredAISpeed()).toBe(0.75);
    });

    it("returns DEFAULT_SPEED when stored value is NaN", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        "not-a-number"
      );
      expect(getStoredAISpeed()).toBe(AI_SPEED_RANGE.DEFAULT_SPEED);
    });

    it("returns DEFAULT_SPEED when stored value is empty string", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("");
      expect(getStoredAISpeed()).toBe(AI_SPEED_RANGE.DEFAULT_SPEED);
    });

    it("returns DEFAULT_SPEED when stored value is negative", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        "-0.5"
      );
      expect(getStoredAISpeed()).toBe(AI_SPEED_RANGE.DEFAULT_SPEED);
    });

    it("returns DEFAULT_SPEED when stored value is greater than 1", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("1.5");
      expect(getStoredAISpeed()).toBe(AI_SPEED_RANGE.DEFAULT_SPEED);
    });

    it("returns DEFAULT_SPEED when stored value is way out of range", () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("100");
      expect(getStoredAISpeed()).toBe(AI_SPEED_RANGE.DEFAULT_SPEED);
    });

    it("handles whitespace in stored value", () => {
      // parseFloat handles leading whitespace
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        "  0.7  "
      );
      expect(getStoredAISpeed()).toBe(0.7);
    });
  });
});
