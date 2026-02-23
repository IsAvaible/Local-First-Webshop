import { injectManifest } from "@serwist/build";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outDir = path.resolve(__dirname, "../../dist/client");
const swDest = path.resolve(outDir, "sw.js");

async function run() {
  console.log("\n🔧 [SERWIST] Injecting manifest post-build...");

  try {
    const result = await injectManifest({
      swSrc: swDest,
      swDest,
      globDirectory: outDir,
      globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest,woff,woff2}"],
      injectionPoint: "self.__SW_MANIFEST",
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
    });

    const cacheSize = (result.size / 1024 / 1024).toFixed(2);
    console.log(
      `✅ [SERWIST] Precached ${result.count} files (${cacheSize} MB) including the SPA shell!`
    );
  } catch (error) {
    console.error("❌ [SERWIST] Failed to inject manifest:", error);
    process.exit(1);
  }
}

void run();
