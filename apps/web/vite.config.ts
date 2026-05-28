import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const repoBase = process.env.VITE_BASE_PATH ?? "/NotUX/";

export default defineConfig({
  base: repoBase,
  plugins: [react()],
  resolve: {
    alias: {
      "@notux/canvas": path.resolve(__dirname, "../../packages/canvas/src"),
      "@notux/sync": path.resolve(__dirname, "../../packages/sync/src"),
      "@notux/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@notux/types": path.resolve(__dirname, "../../packages/types/src"),
    },
  },
  server: {
    port: 5173,
  },
});
