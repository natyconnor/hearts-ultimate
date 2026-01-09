import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for component tests (faster than jsdom)
    environment: "happy-dom",
    globals: true,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Setup file for testing-library matchers
    setupFiles: ["./src/test/setup.ts"],
    // Explicitly exclude .pnpm-store and other directories
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.pnpm-store/**",
      "**/.git/**",
    ],
    // Explicitly set the root to avoid path resolution issues
    root: process.cwd(),
    // CSS handling for component tests
    css: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
