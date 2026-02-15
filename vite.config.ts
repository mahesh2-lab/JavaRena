import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
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
    // Core Web Vitals: enable CSS code splitting for smaller initial payload
    cssCodeSplit: true,
    // Minification for smaller bundle size (LCP improvement) — esbuild is fastest
    minify: "esbuild",
    // Code splitting strategy for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          "vendor-react": ["react", "react-dom"],
          "vendor-monaco": ["@monaco-editor/react"],
          "vendor-ui": ["lucide-react", "framer-motion"],
        },
        // Asset file naming for long-term caching
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
      },
    },
    // Target modern browsers for smaller output
    target: "es2020",
    // Generate source maps for debugging (won't affect users)
    sourcemap: false,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
