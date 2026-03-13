import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["client/**/*.{ts,tsx}", "server/**/*.{ts}", "shared/**/*.{ts}"],
      exclude: [
        "**/*.spec.{ts,tsx}",
        "**/*.test.{ts,tsx}",
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
