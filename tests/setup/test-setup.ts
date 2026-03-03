import { test as baseTest, expect } from "@playwright/test";
import "dotenv/config";

// --- NETWORK PRESETS ---
const NETWORK_PRESETS = {
  FAST_4G: {
    offline: false,
    downloadThroughput: ((9 * 1e3 * 1e3) / 8) * 0.9, // 9 Mbps
    uploadThroughput: ((9 * 1e3 * 1e3) / 8) * 0.9, // 9 Mbps
    latency: 165
  },
  SLOW_3G: {
    offline: false,
    downloadThroughput: ((400 * 1e3) / 8) * 0.9, // 400 Kbps
    uploadThroughput: ((400 * 1e3) / 8) * 0.9, // 400 Kbps
    latency: 2000
  }
};

// --- PROFILES ---
type ProfileName = "baseline" | "commuter" | "budget" | "worst-case";

const PROFILES: Record<
  ProfileName,
  {
    network: (typeof NETWORK_PRESETS)[keyof typeof NETWORK_PRESETS];
    simulateSlowerCPU: boolean;
  }
> = {
  baseline: { network: NETWORK_PRESETS.FAST_4G, simulateSlowerCPU: false },
  commuter: { network: NETWORK_PRESETS.SLOW_3G, simulateSlowerCPU: false },
  budget: { network: NETWORK_PRESETS.FAST_4G, simulateSlowerCPU: true },
  "worst-case": { network: NETWORK_PRESETS.SLOW_3G, simulateSlowerCPU: true }
};

// This test fixture dynamically calibrates CPU throttling for each worker based on the host machine's performance.
// Note: This only modifies the default page fixture. If the test opens additional pages, they will not have throttling applied.
export const throttledTest = baseTest.extend({
  page: async ({ page, browserName }, startTest) => {
    if (browserName === "chromium") {
      const profileKey =
        (process.env.TEST_PROFILE as ProfileName) || "baseline";
      const profile = PROFILES[profileKey] || PROFILES.baseline;

      const client = await page.context().newCDPSession(page);

      // Apply CPU Throttling
      const dynamicRate = parseFloat(process.env.DYNAMIC_CPU_RATE ?? "1");
      const finalRate = profile.simulateSlowerCPU
        ? dynamicRate // Apply full CPU throttling to match mid-range mobile device
        : dynamicRate / 3; // Apply less CPU throttling to match high-end consumer device

      if (finalRate > 1) {
        await client.send("Emulation.setCPUThrottlingRate", {
          rate: finalRate
        });
      }

      // Apply Network Throttling
      if (profile.network.latency > 0) {
        await client.send("Network.enable");
        await client.send("Network.emulateNetworkConditions", profile.network);
      }
    }

    await startTest(page);
  }
});

export { expect };
