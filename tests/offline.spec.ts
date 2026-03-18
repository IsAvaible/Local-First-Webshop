import { expect } from "@playwright/test";
import { throttledTest, throttledTest as test } from "./setup/test-setup";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { SearchPage } from "./pages/SearchPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { db } from "@/db/connection.ts";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetricType } from "./utils/metrics-reporter.ts";
import fs from "fs";
import {
  parseTraceForSyncMetrics,
  type TraceData
} from "./utils/parse-trace-metrics.ts";

test.describe("Offline & Recovery Tests", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("Feature Availability Audit", async ({ page }) => {
    const searchPage = new SearchPage(page);
    const cartPage = new CartPage(page);
    const productPage = new ProductPage(page);

    await test.step("Setup: Seed DB and navigate to Search", async () => {
      await seedDatabase({ categories: 2, productsPerCategory: 5 });
      await searchPage.goto();
    });

    await test.step("Action: Simulate Network Disconnect", async () => {
      await page.context().setOffline(true);
    });

    await test.step("Ensure products are initially loaded", async () => {
      // Wait for at least one product card to be visible
      await expect(searchPage.productCards.first()).toBeVisible();
    });

    await test.step("Apply a category filter and verify state change", async () => {
      const category = await db.query.categoriesTable.findFirst();
      if (!category) {
        throw new Error("No categories found in the database.");
      }

      const productsWithCategory = (
        await db.query.productsTable.findMany({
          where: eq(schema.productsTable.category_id, category.id)
        })
      ).length;
      await searchPage.toggleCategory(category.name);

      await page.waitForURL(/categories=/);

      const filteredCount = await searchPage.getProductCount();

      expect(filteredCount).toEqual(productsWithCategory);
    });

    await test.step("Verify: Add to Cart works locally", async () => {
      await searchPage.productCards.first().click();

      await productPage.addItemToCart();
    });

    await test.step("Verify: Critical actions (Checkout) are blocked", async () => {
      await cartPage.goto();
      await cartPage.checkoutBtn.click();

      // Expect rejection/warning toast or modal
      await expect(
        page.getByText(/Offline|Connection Required|No Internet/i)
      ).toBeVisible();
    });
  });

  throttledTest(
    "Sync Recovery Stress Test",
    { tag: "@metric" },
    async ({ page, browser }) => {
      test.skip(
        process.env.APP_MODE === "ssr",
        "SSR does not support automatic offline work and re-syncs."
      );

      const searchPage = new SearchPage(page);
      const productPage = new ProductPage(page);
      const mutationCount = 50;

      await test.step("Setup: Seed and navigate", async () => {
        await seedDatabase({ categories: 1, productsPerCategory: 1 });
        await searchPage.goto();
      });

      await test.step("Action: Go Offline and navigate to Product", async () => {
        await page.context().setOffline(true);
        await searchPage.productCards.first().click();
      });

      await test.step(`Action: Perform ${mutationCount} offline mutations`, async () => {
        await productPage.addItemToCart();
        for (let i = 1; i < mutationCount; i++) {
          await productPage.increaseQtyBtn.click();
        }
      });

      await test.step("Verification: Measure recovery via Chrome Profiler", async () => {
        const tracePath = `sync-trace-${Date.now()}.json`;

        // Network listener for the sync request
        const syncCompletedPromise = page.waitForResponse(
          (res) =>
            res.url().includes("/api/ydoc-updates") && res.status() === 200,
          { timeout: 15000 }
        );

        await browser.startTracing(page, {
          path: tracePath,
          categories: ["devtools.timeline", "v8", "benchmark", "viz"]
        });

        const start = performance.now();

        // Restore connection
        await page.context().setOffline(false);

        // Wait for the background sync to confirm
        await syncCompletedPromise;
        // TODO Wait for an UI indicator that sync is complete
        // "Workaround"
        await page.waitForTimeout(500);

        const duration = performance.now() - start;

        // Stop Tracing
        await browser.stopTracing();

        // Parse the Trace File for Blocking Time and Dropped Frames
        const traceData = JSON.parse(
          fs.readFileSync(tracePath, "utf8")
        ) as TraceData;
        const metrics = parseTraceForSyncMetrics(traceData);

        console.log(`Sync Recovery Wall-clock Time: ${duration.toFixed(2)}ms`);
        console.log(
          `Main Thread Blocking Time: ${metrics.blockingTimeMs.toFixed(2)}ms`
        );
        console.log(`Dropped Frames: ${metrics.droppedFrames}`);

        // Log Annotations
        test.info().annotations.push(
          {
            type: MetricType.SYNC_RECOVERY_TIME,
            description: JSON.stringify({
              value: duration,
              unit: "ms"
            })
          },
          {
            type: MetricType.MAIN_THREAD_BLOCKING_TIME,
            description: JSON.stringify({
              value: metrics.blockingTimeMs,
              unit: "ms"
            })
          },
          {
            type: MetricType.DROPPED_FRAMES,
            description: JSON.stringify({
              value: metrics.droppedFrames,
              unit: "count"
            })
          }
        );

        // Clean up trace file
        fs.unlinkSync(tracePath);
      });
    }
  );

  test("'Ghost Cart' Restoration", async ({ page }) => {
    const productPage = new ProductPage(page);
    const searchPage = new SearchPage(page);

    await test.step("Setup: Create a cart session", async () => {
      await seedDatabase({ categories: 1, productsPerCategory: 1 });
      await searchPage.goto();
      await searchPage.productCards.first().click();

      await productPage.addItemToCart();
    });

    await test.step("Action: Simulate fresh device (Clear IndexedDB)", async () => {
      await page.evaluate(async () => {
        const dbs = await window.indexedDB.databases();
        for (const dbInfo of dbs) {
          if (dbInfo.name) window.indexedDB.deleteDatabase(dbInfo.name);
        }
      });
    });

    await test.step("Verification: Reload and verify Cart Restoration from Server", async () => {
      await page.reload();

      // Verify restoration
      await productPage.verifyCartBadgeCount(1, { timeout: 10000 });
    });
  });
});
