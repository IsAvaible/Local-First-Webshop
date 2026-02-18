import { test, expect } from "@playwright/test";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { SearchPage } from "./pages/SearchPage";
import { db } from "@/db/connection.ts";

test.describe("Performance & Resource Tests", () => {
  test.beforeEach(async () => {
    await test.step("Reset database state", async () => {
      await resetDatabase();
    });
  });

  test("Initial Sync Time (Time to Data Availability)", async ({ page }) => {
    // Arrange
    await test.step("Seed database with initial data", async () => {
      await seedDatabase({ categories: 5, productsPerCategory: 20 });
    });

    const searchPage = new SearchPage(page);

    // Act & Measure
    const duration =
      await test.step("Measure page load to product visibility", async () => {
        const startTime = performance.now();
        await searchPage.goto();

        // We consider sync "done" when the products list is populated.
        await expect(searchPage.productCards.first()).toBeVisible({
          timeout: 10000
        });

        const endTime = performance.now();
        return endTime - startTime;
      });

    // Assert
    await test.step(`Verify duration (${duration.toFixed(2)}ms) is under 5000ms`, () => {
      console.log(`Initial Sync & Render Time: ${duration}ms`);
      expect(duration).toBeLessThan(5000);
    });
  });

  test("Interaction Latency: Local Filter", async ({ page }) => {
    const searchPage = new SearchPage(page);
    let category: string;

    // Arrange
    await test.step("Setup: Load page with data", async () => {
      await seedDatabase({ categories: 2, productsPerCategory: 10 });

      // Fetch a valid category from the database to use in the test
      const name = (await db.query.categoriesTable.findFirst())?.name;

      if (!name) {
        throw new Error("No categories found in the database.");
      } else {
        category = name;
      }

      await searchPage.goto();
      await expect(searchPage.productCards.first()).toBeVisible();
    });

    // Act & Measure
    const latency =
      await test.step("Measure filter interaction latency", async () => {
        const startMeasure = performance.now();

        await searchPage.toggleCategory(category);

        await page.waitForURL(/categories=/);

        const endMeasure = performance.now();
        return endMeasure - startMeasure;
      });

    // Assert
    await test.step(`Verify latency (${latency.toFixed(2)}ms) is under 200ms`, () => {
      console.log(`Interaction Latency: ${latency.toFixed(2)}ms`);
      expect(latency).toBeLessThan(200);
    });
  });

  test("Storage Footprint", async ({ page }) => {
    const searchPage = new SearchPage(page);

    // Arrange
    await test.step("Load heavy dataset", async () => {
      await seedDatabase({ categories: 2, productsPerCategory: 50 });
      await searchPage.goto();
      await expect(searchPage.productCards.first()).toBeVisible();
    });

    // Act
    const estimate = await test.step("Retrieve storage estimate", async () => {
      return await page.evaluate(async () => {
        if ("storage" in navigator && navigator.storage?.estimate) {
          return await navigator.storage.estimate();
        }
        return null;
      });
    });

    // Assert
    await test.step("Validate storage usage", () => {
      if (estimate) {
        const usageMB = (estimate.usage! / 1024 / 1024).toFixed(2);
        console.log(`Storage Usage: ${usageMB} MB`);
        expect(estimate.usage).toBeGreaterThan(0);
      } else {
        console.log("Storage API not available");
      }
    });
  });

  test("Client Resource Tax (Heap Memory)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "CDP only supported in Chromium");

    const searchPage = new SearchPage(page);

    // Arrange
    const client = await test.step("Initialize CDP and Seed DB", async () => {
      await seedDatabase({ categories: 5, productsPerCategory: 20 });
      const client = await page.context().newCDPSession(page);
      await client.send("Performance.enable");
      return client;
    });

    // Act
    await test.step("Simulate user session", async () => {
      await searchPage.goto();
      await expect(searchPage.productCards.first()).toBeVisible();
    });

    // Assert
    await test.step("Analyze JS Heap usage", async () => {
      const metrics = await client.send("Performance.getMetrics");
      const jsHeapUsedNode = metrics.metrics.find(
        (m) => m.name === "JSHeapUsedSize"
      );

      if (jsHeapUsedNode) {
        const heapUsedMB = jsHeapUsedNode.value / 1024 / 1024;
        console.log(`JS Heap Used: ${heapUsedMB.toFixed(2)} MB`);
        expect(heapUsedMB).toBeLessThan(100);
      }
    });
  });

  test("Mobile Stability", async ({ page }) => {
    const searchPage = new SearchPage(page);

    // Arrange
    await test.step("Configure mobile viewport and data", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await seedDatabase({ categories: 5, productsPerCategory: 20 });
      await searchPage.goto();
      await expect(searchPage.productCards.first()).toBeVisible();
    });

    // Act
    await test.step("Perform scroll interaction", async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500); // Allow for potential crash/lag
    });

    // Assert
    await test.step("Verify application is still responsive", async () => {
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });
});
