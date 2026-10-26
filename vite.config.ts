import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  build: {
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: {
        popup: "popup.html",
        options: "options.html",
        background: "src/background/service-worker.ts",
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
