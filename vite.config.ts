import { defineConfig } from "vite";
import path from "path";
import { caddyPlugin } from "./src/vite-plugin-caddy";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  plugins: [
    caddyPlugin(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      start: { entry: "./start.tsx" },
      server: { entry: "./server.ts" },
      router: {
        // @ts-expect-error field is not defined
        srcDirectory: "src"
      },
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
  ssr: {
    noExternal: ["zod"]
  },
  // shadcn specific
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
