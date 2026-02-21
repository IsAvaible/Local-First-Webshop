import { test as baseTest, expect } from "@playwright/test";
import "dotenv/config";

const FAST_4G = {
  offline: false,
  downloadThroughput: ((9 * 1e3 * 1e3) / 8) * 0.9, // 9 Mbps
  uploadThroughput: ((9 * 1e3 * 1e3) / 8) * 0.9, // 9 Mbps
  latency: 165
};

const TARGET_BENCHMARK_MS = 500;

type MyTestFixtures = object;

type MyWorkerFixtures = {
  dynamicRate: number;
};

// This test fixture dynamically calibrates CPU throttling for each worker based on the host machine's performance.
// Note: This only modifies the default page fixture. If the test opens additional pages, they will not have throttling applied.
export const throttledTest = baseTest.extend<MyTestFixtures, MyWorkerFixtures>({
  dynamicRate: [
    async ({ browser }, use) => {
      // Only Chromium supports CDP
      if (browser.browserType().name() !== "chromium") {
        console.log(
          `[Worker CPU Calibration] Skipped: Browser is not Chromium.`
        );
        await use(1); // Default rate
        return;
      }
      if (!process.env.CI) {
        console.log(
          `[Worker CPU Calibration] Skipped: Not running in CI environment.`
        );
        await use(1);
        return;
      }

      const page = await browser.newPage();

      const hostTimeMs = await page.evaluate(() => {
        const times: number[] = [];

        for (let run = 0; run < 5; run++) {
          const start = performance.now();
          const container = document.createElement("div");
          document.body.appendChild(container);

          // This number was selected to approximately match the "Mid-tier mobile device" preset in Chrome.
          // Throttling applied by the Preset after calibration: 3.6x
          // Throttling applied by this benchmark after calibration: 3.5x-3.7x
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

        // Sort and grab the middle value
        times.sort((a, b) => a - b);
        return times[Math.floor(times.length / 2)];
      });

      await page.close();

      const rate = Math.max(1, TARGET_BENCHMARK_MS / hostTimeMs);
      if (rate === 1) {
        console.log(
          `[Worker CPU Calibration] Host baseline median: ${hostTimeMs.toFixed(2)}ms. No throttling applied.`
        );
      } else {
        console.log(
          `[Worker CPU Calibration] Host baseline median: ${hostTimeMs.toFixed(2)}ms. Applied Rate: ${rate.toFixed(2)}x`
        );
      }

      await use(rate);
    },
    { scope: "worker" }
  ],

  // Extend the page fixture to apply the pre-calculated throttling rate
  page: async ({ page, dynamicRate, browserName }, startTest) => {
    if (browserName === "chromium" && process.env.CI) {
      const client = await page.context().newCDPSession(page);

      // Apply CPU throttling if needed
      if (dynamicRate > 1) {
        await client.send("Emulation.setCPUThrottlingRate", {
          rate: dynamicRate
        });
      }

      await client.send("Network.enable");
      // Apply network conditions
      await client.send("Network.emulateNetworkConditions", FAST_4G);
    }

    await startTest(page);
  }
});

export { expect };
