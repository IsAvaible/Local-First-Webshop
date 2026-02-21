import { test as baseTest, expect } from "@playwright/test";

const FAST_4G = {
  offline: false,
  downloadThroughput: (1.5 * 1024 * 1024) / 8,
  uploadThroughput: (0.75 * 1024 * 1024) / 8,
  latency: 40
};

// Define baseline to compare against host device performance.
const TARGET_BENCHMARK_MS = 500;

export const throttledTest = baseTest.extend({
  page: async ({ page }, runTest) => {
    const client = await page.context().newCDPSession(page);

    // Run the Benchmark in the browser context
    const hostTimeMs = await page.evaluate(() => {
      const start = performance.now();
      let sum = 0;
      // An arbitrary heavy loop.
      for (let i = 0; i < 20000000; i++) {
        sum += Math.sqrt(i);
      }
      return performance.now() - start;
    });

    // Calculate the dynamic throttling rate
    const dynamicRate = Math.max(1, TARGET_BENCHMARK_MS / hostTimeMs);

    if (dynamicRate < 1) {
      console.warn(
        `[CPU Calibration] WARNING: Host is slower (${hostTimeMs.toFixed(2)}ms) than target. Results may be pessimistic.`
      );
    }

    console.log(
      `[CPU Calibration] Host baseline: ${hostTimeMs.toFixed(2)}ms. Target: ${TARGET_BENCHMARK_MS}ms. Applied Rate: ${dynamicRate.toFixed(2)}x`
    );

    // 4. Apply the Dynamic CPU Throttling
    await client.send("Emulation.setCPUThrottlingRate", { rate: dynamicRate });

    // 5. Apply Network Throttling
    await client.send("Network.emulateNetworkConditions", FAST_4G);

    // Yield the globally throttled page to the actual test
    await runTest(page);
  }
});

export { expect };
