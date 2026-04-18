import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// Get HMR host from environment or use default
const getHmrHost = () => {
  if (process.env.HMR_HOST) return process.env.HMR_HOST;
  if (process.env.VITE_HMR_HOST) return process.env.VITE_HMR_HOST;
  // Default to the Manus platform domain
  return "3000-isnr7j68h2l3seksvwqg4-f434d613.manusvm.computer";
};


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      host: getHmrHost(),
      port: 443,
      protocol: "wss",
    },
    fs: {
      strict: false,
      deny: ["**/.*"],
    },
  },
});
