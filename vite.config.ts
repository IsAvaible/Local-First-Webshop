import { defineConfig } from "vite";
import path from "path";
import { caddyPlugin } from "./src/vite-plugin-caddy";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { devtools } from "@tanstack/devtools-vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  plugins: [
    devtools(),
    caddyPlugin(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        failOnError: true,
        filter: ({ path }) => !path.startsWith("/profile")
      }
    }),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]]
      }
    }),
    visualizer({ emitFile: true, filename: "vite-bundle-stats.html" })
  ],
  // shadcn specific
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
