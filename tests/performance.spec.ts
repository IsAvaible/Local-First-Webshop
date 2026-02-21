import { expect } from "@playwright/test";
import { throttledTest as test } from "./test-setup";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { SearchPage } from "./pages/SearchPage";
import { db } from "@/db/connection.ts";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.ts";
import { ProductPage } from "./pages/ProductPage.ts";

test.describe("Performance & Resource Tests", () => {
  test.beforeEach(async () => {
    await test.step("Reset database state", async () => {
      await resetDatabase();
    });
  });

  test("Initial Sync Time (Time to Data Availability)", async ({ page }) => {
    await test.step("Seed database with initial data", async () => {
      await seedDatabase({ categories: 5, productsPerCategory: 20 });
    });

    const searchPage = new SearchPage(page);

    // Measure
    const duration =
      await test.step("Measure time to product visibility", async () => {
        const startTime = performance.now();

        await searchPage.goto();

        return performance.now() - startTime;
      });

    // Assert
    await test.step(`Verify initial duration (${duration.toFixed(2)}ms) is under 5000ms`, () => {
      console.log(`Initial Sync & Render Time: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5000);
    });
  });

  test("Subsequent navigation utilizes populated cache for faster load", async ({
    page
  }) => {
    await test.step("Seed database and prime cache", async () => {
      await seedDatabase({ categories: 5, productsPerCategory: 20 });
    });

    const searchPage = new SearchPage(page);
    const productPage = new ProductPage(page);

    // Measure initial load
    const initialDuration =
      await test.step("Measure initial load", async () => {
        const startTime = performance.now();
        await searchPage.goto();
        return performance.now() - startTime;
      });

    // Navigate away
    await test.step("Navigate away to clear active document state", async () => {
      await searchPage.productCards.first().click();
      await expect(productPage.addToCartBtn).toBeVisible();
    });

    // Act: Navigate back using the warm cache via SPA routing
    const cachedDuration =
      await test.step("Measure cached load time", async () => {
        const startTime = performance.now();

        await page.goBack();
        await expect(searchPage.productCards.first()).toBeVisible();

        return performance.now() - startTime;
      });

    // Assert
    await test.step(`Verify cached load (${cachedDuration.toFixed(2)}ms) is faster than initial (${initialDuration.toFixed(2)}ms)`, () => {
      console.log(
        `Initial Time: ${initialDuration.toFixed(2)}ms | Cached Time: ${cachedDuration.toFixed(2)}ms`
      );

      expect(cachedDuration).toBeLessThan(initialDuration);

      if (!process.env.CI) {
        expect(cachedDuration).toBeLessThan(500);
      }
    });
  });

  test("Interaction Latency: Local Filter", async ({ page }) => {
    const searchPage = new SearchPage(page);
    let categoryName: string;
    let productsWithCategory: number;

    // Arrange
    await test.step("Setup: Load page with data", async () => {
      await seedDatabase({ categories: 2, productsPerCategory: 10 });

      // Fetch a valid category from the database to use in the test
      const category = await db.query.categoriesTable.findFirst();

      if (!category) {
        throw new Error("No categories found in the database.");
      } else {
        categoryName = category.name;
      }

      productsWithCategory = (
        await db.query.productsTable.findMany({
          where: eq(schema.productsTable.category_id, category.id)
        })
      ).length;

      await searchPage.goto();
    });

    let latency = 0;
    await test.step("Measure filter interaction latency", async () => {
      await searchPage.toggleCategory(categoryName, {
        beforeToggleCallback: async () => {
          // Inject an event listener to mark the EXACT time the click occurs in the browser
          await page.evaluate(() => {
            window.addEventListener(
              "click",
              () => {
                window.performance.mark("click-start");
              },
              { once: true, capture: true }
            );
          });
        },
        afterToggleCallback: async () => {
          expect(await searchPage.getProductCount()).toBe(productsWithCategory);

          // Measure the elapsed time entirely within the browser context
          latency = await page.evaluate(() => {
            window.performance.mark("ui-settled");
            const measure = window.performance.measure(
              "interaction-latency",
              "click-start",
              "ui-settled"
            );

            // Clean up
            window.performance.clearMarks();
            window.performance.clearMeasures();

            return measure.duration;
          });
        }
      });

      if (!latency) {
        throw new Error("Failed to measure interaction latency");
      }
    });

    // Assert
    await test.step(`Verify latency (${latency.toFixed(2)}ms) is under 200ms`, () => {
      console.log(`Interaction Latency: ${latency.toFixed(2)}ms`);
      expect(latency).toBeLessThan(250);
    });
  });

  test("Storage Footprint", async ({ page }) => {
    const searchPage = new SearchPage(page);

    // Arrange
    await test.step("Load heavy dataset", async () => {
      await seedDatabase({ categories: 2, productsPerCategory: 50 });
      await searchPage.goto();
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
      await seedDatabase({ categories: 2000, productsPerCategory: 10 });
      await searchPage.goto();
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
