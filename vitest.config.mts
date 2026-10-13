import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/gates/**/*.test.ts"],
    // Gates spawn real Python once per exercise file; give them room.
    testTimeout: 30_000,
  },
});
