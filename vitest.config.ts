import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "tests/**",
      "node_modules/**",
      "dist/**",
      ".next/**",
      // Harness worktrees under .claude/ and .codex/ contain checked-out
      // copies of stale branches; without this exclusion vitest scans them
      // and reports failures from old test fixtures that were valid against
      // their snapshot of main but not against current main.
      ".claude/worktrees/**",
      ".codex/worktrees/**",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
