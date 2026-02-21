import { test as baseTest, expect } from "@playwright/test";
import "dotenv/config";

const FAST_4G = {
  offline: false,
  downloadThroughput: ((9 * 1e3 * 1e3) / 8) * 0.9, // 9 Mbps
  uploadThroughput: ((9 * 1e3 * 1e3) / 8) * 0.9, // 9 Mbps
  latency: 165
};

// This test fixture dynamically calibrates CPU throttling for each worker based on the host machine's performance.
// Note: This only modifies the default page fixture. If the test opens additional pages, they will not have throttling applied.
export const throttledTest = baseTest.extend({
  page: async ({ page, browserName }, startTest) => {
    if (browserName === "chromium" && process.env.CI) {
      const client = await page.context().newCDPSession(page);

      // Read the rate calculated globally
      const dynamicRate = parseFloat(process.env.DYNAMIC_CPU_RATE ?? "1");

      if (dynamicRate > 1) {
        await client.send("Emulation.setCPUThrottlingRate", {
          rate: dynamicRate
        });
      }

      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", FAST_4G);
    } else {
      console.log(
        `[Worker CPU Calibration] Skipped: Browser is not Chromium or not running in CI.`
      );
    }

    await startTest(page);
  }
});

export { expect };
