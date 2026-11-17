import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  main: {
    // Bundle the pure-JS imaging libs so the packaged app needs no node_modules.
    plugins: [externalizeDepsPlugin({ exclude: ["exifr", "image-size"] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer/src")
      }
    },
    plugins: [react(), tailwindcss()]
  }
});
