import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    cssCodeSplit: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 1000,
    target: "es2020",
    sourcemap: false,
  },

  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // REST API
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Share routes
      "/s/": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Socket.IO — must use ws upgrade
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,           // proxy WebSocket upgrade
      },
    },
  },
});
