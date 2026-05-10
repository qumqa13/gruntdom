import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/__tests__/**/*.test.ts",
      "src/**/*.test.ts",
      "__fixtures__/__tests__/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/geoportal/**/*.ts"],
      exclude: ["**/__tests__/**", "**/*.test.ts"],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
