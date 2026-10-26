import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  root: "web",
  base: "./",
  plugins: [preact()],
  server: { fs: { allow: [".."] } },
  build: {
    outDir: "../dist-web",
    emptyOutDir: true,
    rolldownOptions: {
      input: { index: "index.html", settings: "settings.html" },
    },
  },
});
