import { defineConfig } from "vite";
import path from "path";
import { caddyPlugin } from "./src/vite-plugin-caddy";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { devtools } from "@tanstack/devtools-vite";

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
      spa: {
        enabled: true
      }
    }),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]]
      }
    })
  ],
  // shadcn specific
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
