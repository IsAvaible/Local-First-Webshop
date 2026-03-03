import { chromium, type FullConfig } from "@playwright/test";
import "dotenv/config";

const TARGET_BENCHMARK_MS = 500;

async function globalSetup(_config: FullConfig) {
  console.log(`[Global CPU Calibration] Running baseline benchmark...`);

  // Launch a browser instance strictly for the calibration
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const hostTimeMs = await page.evaluate(() => {
    const times: number[] = [];
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      const container = document.createElement("div");
      document.body.appendChild(container);

      for (let i = 0; i < 37000; i++) {
        const el = document.createElement("div");
        el.style.width = `${i % 100}px`;
        el.textContent = "test";
        container.appendChild(el);
      }

      container.getBoundingClientRect();
      document.body.removeChild(container);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)];
  });

  await browser.close();

  const rate = Math.max(1, TARGET_BENCHMARK_MS / hostTimeMs);

  if (rate === 1) {
    console.log(
      `[Global CPU Calibration] Median: ${hostTimeMs.toFixed(2)}ms. No throttling applied.`
    );
  } else {
    console.log(
      `[Global CPU Calibration] Median: ${hostTimeMs.toFixed(2)}ms. Applied Rate: ${rate.toFixed(2)}x`
    );
  }

  // Playwright automatically passes process.env changes from globalSetup down to all workers
  process.env.DYNAMIC_CPU_RATE = rate.toString();
}

export default globalSetup;
