// `vitest/config` re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from "vitest/config";

// Tauri injects this when running `tauri dev` against a physical device.
const host = process.env["TAURI_DEV_HOST"];
const isDebugBuild = Boolean(process.env["TAURI_ENV_DEBUG"]);

export default defineConfig({
  // Tauri owns the terminal output; don't let Vite wipe it.
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    ...(host ? { hmr: { protocol: "ws", host, port: 1421 } } : {}),
    watch: {
      // The Rust side has its own watcher.
      ignored: ["**/src-tauri/**"],
    },
  },

  envPrefix: ["VITE_", "TAURI_ENV_*"],

  build: {
    target: "es2022",
    minify: isDebugBuild ? false : "esbuild",
    sourcemap: isDebugBuild,
  },

  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
