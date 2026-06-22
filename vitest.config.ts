import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    passWithNoTests: true,
    // Pin TZ so date-boundary logic in lib/tasks is deterministic across machines.
    env: { TZ: "UTC" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
