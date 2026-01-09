import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Explicitly exclude .pnpm-store and other directories
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.pnpm-store/**",
      "**/.git/**",
    ],
    // Explicitly set the root to avoid path resolution issues
    root: process.cwd(),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
