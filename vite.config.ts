import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]]
      }
    }),
    wasm()
  ],
  // shadcn specific
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
