import path from "node:path";
import type { Plugin } from "vite";
import { build } from "vite";

/**
 * Custom Serwist plugin for TanStack Start
 * Builds service worker in both dev and production modes
 * From: https://github.com/TanStack/router/discussions/4770#discussioncomment-15274878
 */
export function tanstackSerwistPlugin(): Plugin {
  let rootDir: string;
  let isProduction: boolean;

  return {
    name: "tanstack-serwist",
    configResolved(config) {
      rootDir = config.root;
      isProduction = config.isProduction;
    },
    async buildStart() {
      // Build service worker in dev mode
      if (!isProduction) {
        await buildServiceWorker(rootDir, false);
      }
    },
    async closeBundle() {
      // Build service worker in production mode
      if (isProduction) {
        await buildServiceWorker(rootDir, true);
      }
    }
  };
}

async function buildServiceWorker(rootDir: string, production: boolean) {
  const outName = "sw.js";
  const outDir = production
    ? path.resolve(rootDir, "dist", "client")
    : path.resolve(rootDir, "public");
  const swSrc = path.resolve(rootDir, "src", "sw.ts");
  const env = production ? "production" : "dev";

  console.log(`\n🔧 [SERWIST] Building service worker (${env})...`);

  try {
    // Step 1: Bundle the service worker with Vite
    await build({
      root: rootDir,
      configFile: false,
      define: {
        "process.env.NODE_ENV": JSON.stringify(
          production ? "production" : "development"
        )
      },
      build: {
        lib: {
          entry: swSrc,
          formats: ["es"],
          fileName: () => outName
        },
        outDir,
        emptyOutDir: false,
        minify: production,
        rollupOptions: {
          output: {
            entryFileNames: outName
          }
        }
      },
      logLevel: "error"
    });

    // Step 2: Inject the precache manifest (only in production)
    if (production) {
      console.log(
        "✅ [SERWIST] Production service worker built (waiting for post-build manifest injection)"
      );
    } else {
      console.log("✅ [SERWIST] Dev service worker built");
    }
  } catch (error) {
    console.error("❌ [SERWIST] Failed to build service worker:", error);
    throw error;
  }
}
