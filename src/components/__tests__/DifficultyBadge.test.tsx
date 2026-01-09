import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DifficultyBadge,
  DifficultyBadgeIcon,
  getDifficultyBadgeInfo,
} from "../DifficultyBadge";

describe("DifficultyBadge", () => {
  describe("getDifficultyBadgeInfo", () => {
    it("returns null for undefined difficulty", () => {
      expect(getDifficultyBadgeInfo(undefined)).toBeNull();
    });

    it("returns correct info for easy difficulty", () => {
      const info = getDifficultyBadgeInfo("easy");
      expect(info).toEqual({
        icon: "🌱",
        label: "Easy",
        color: "bg-green-500/20 border-green-500/40 text-green-200",
      });
    });

    it("returns correct info for medium difficulty", () => {
      const info = getDifficultyBadgeInfo("medium");
      expect(info).toEqual({
        icon: "⚡",
        label: "Medium",
        color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-200",
      });
    });

    it("returns correct info for hard difficulty", () => {
      const info = getDifficultyBadgeInfo("hard");
      expect(info).toEqual({
        icon: "🧠",
        label: "Hard",
        color: "bg-purple-500/20 border-purple-500/40 text-purple-200",
      });
    });
  });

  describe("DifficultyBadge component", () => {
    it("renders nothing for undefined difficulty", () => {
      const { container } = render(<DifficultyBadge difficulty={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders easy badge with icon and label", () => {
      render(<DifficultyBadge difficulty="easy" />);
      expect(screen.getByText("🌱")).toBeInTheDocument();
      expect(screen.getByText("Easy")).toBeInTheDocument();
    });

    it("renders medium badge with icon and label", () => {
      render(<DifficultyBadge difficulty="medium" />);
      expect(screen.getByText("⚡")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
    });

    it("renders hard badge with icon and label", () => {
      render(<DifficultyBadge difficulty="hard" />);
      expect(screen.getByText("🧠")).toBeInTheDocument();
      expect(screen.getByText("Hard")).toBeInTheDocument();
    });

    it("applies sm size classes by default", () => {
      render(<DifficultyBadge difficulty="easy" />);
      const badge = screen.getByTitle("Easy");
      expect(badge).toHaveClass("text-[10px]");
    });

    it("applies md size classes when specified", () => {
      render(<DifficultyBadge difficulty="easy" size="md" />);
      const badge = screen.getByTitle("Easy");
      expect(badge).toHaveClass("text-xs");
    });

    it("applies custom className", () => {
      render(<DifficultyBadge difficulty="easy" className="custom-class" />);
      const badge = screen.getByTitle("Easy");
      expect(badge).toHaveClass("custom-class");
    });
  });

  describe("DifficultyBadgeIcon component", () => {
    it("renders nothing for undefined difficulty", () => {
      const { container } = render(
        <DifficultyBadgeIcon difficulty={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders icon only for easy difficulty", () => {
      render(<DifficultyBadgeIcon difficulty="easy" />);
      expect(screen.getByText("🌱")).toBeInTheDocument();
      expect(screen.queryByText("Easy")).not.toBeInTheDocument();
    });

    it("renders icon only for medium difficulty", () => {
      render(<DifficultyBadgeIcon difficulty="medium" />);
      expect(screen.getByText("⚡")).toBeInTheDocument();
      expect(screen.queryByText("Medium")).not.toBeInTheDocument();
    });

    it("renders icon only for hard difficulty", () => {
      render(<DifficultyBadgeIcon difficulty="hard" />);
      expect(screen.getByText("🧠")).toBeInTheDocument();
      expect(screen.queryByText("Hard")).not.toBeInTheDocument();
    });

    it("has title attribute for accessibility", () => {
      render(<DifficultyBadgeIcon difficulty="medium" />);
      expect(screen.getByTitle("Medium")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <DifficultyBadgeIcon difficulty="hard" className="test-class" />
      );
      const badge = screen.getByTitle("Hard");
      expect(badge).toHaveClass("test-class");
    });
  });
});
