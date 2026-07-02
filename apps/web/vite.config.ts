import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/session": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/command-center": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/pilot": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/audit": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/memberships": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/sync": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/evidence": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/gpp": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/shift-close": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/probe": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
