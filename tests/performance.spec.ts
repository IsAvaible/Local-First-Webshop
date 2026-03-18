import { expect } from "@playwright/test";
import { throttledTest as test } from "./setup/test-setup";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { SearchPage } from "./pages/SearchPage";
import { db } from "@/db/connection.ts";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.ts";
import { ProductPage } from "./pages/ProductPage.ts";
import { testConfig } from "./test-config.ts";
import { MetricType } from "./utils/metrics-reporter.ts";

test.describe("Performance & Resource Tests", { tag: "@metric" }, () => {
  test.beforeEach(async () => {
    await test.step("Reset database state", async () => {
      await resetDatabase();
    });
  });

  // PARAMETERIZED TESTS
  testConfig.productCounts.forEach((totalProducts) => {
    const categoriesCount = 10;
    const productsPerCategory = Math.floor(totalProducts / categoriesCount);

    test.describe(`Dataset with ${totalProducts} products`, () => {
      test("Initial Sync Time (Time to Data Availability)", async ({
        page
      }) => {
        await test.step(`Seed database with ${totalProducts} total products`, async () => {
          await seedDatabase({
            categories: categoriesCount,
            productsPerCategory
          });
        });

        const searchPage = new SearchPage(page);

        // Measure
        const duration =
          await test.step("Measure time to product visibility", async () => {
            const startTime = performance.now();
            await searchPage.goto();
            return performance.now() - startTime;
          });

        await test.step(`Verify initial duration (${duration.toFixed(2)}ms)`, () => {
          console.log(
            `[${totalProducts} items] Initial Sync & Render Time: ${duration.toFixed(2)}ms`
          );

          test.info().annotations.push({
            type: MetricType.INITIAL_SYNC_TIME,
            description: JSON.stringify({
              value: Number(duration.toFixed(2)),
              unit: "ms"
            })
          });

          // Skip Assertion
          // expect(duration).toBeLessThan(5000);
        });
      });

      test("Interaction Latency: Local Filter", async ({ page }) => {
        const searchPage = new SearchPage(page);
        let categoryName: string;
        let productsWithCategory: number;

        // Arrange
        await test.step("Setup: Load page with data", async () => {
          await seedDatabase({
            categories: categoriesCount,
            productsPerCategory
          });

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
              latency = await page.evaluate(async (expectedCount) => {
                return new Promise((resolve, reject) => {
                  const countElement = document.querySelector(
                    '[data-testid="total-product-count"]'
                  );

                  if (!countElement) {
                    return reject(new Error("Count element not found"));
                  }

                  // Function to check the count and record the mark if it matches
                  const checkAndMeasure = () => {
                    const currentCount = parseInt(
                      countElement.getAttribute("data-count") ?? "0",
                      10
                    );

                    if (currentCount === expectedCount) {
                      // Mark exactly when the DOM has the correct data
                      window.performance.mark("ui-settled");
                      const measure = window.performance.measure(
                        "interaction-latency",
                        "click-start",
                        "ui-settled"
                      );

                      window.performance.clearMarks();
                      window.performance.clearMeasures();

                      resolve(measure.duration);
                      return true;
                    }
                    return false;
                  };

                  // Check immediately in case it updated incredibly fast
                  if (checkAndMeasure()) return;

                  // If not updated yet, observe the element for changes
                  const observer = new MutationObserver(() => {
                    if (checkAndMeasure()) {
                      observer.disconnect(); // Stop observing once we have our measurement
                    }
                  });

                  observer.observe(countElement, {
                    attributes: true,
                    attributeFilter: ["data-count"]
                  });

                  setTimeout(() => {
                    observer.disconnect();
                    reject(
                      new Error("Timeout waiting for product count to update")
                    );
                  }, 5000);
                });
              }, productsWithCategory);

              if (!latency) {
                throw new Error("Failed to measure interaction latency");
              }
            }
          });
        });

        // Assert
        await test.step(`Verify latency (${latency.toFixed(2)}ms)`, () => {
          console.log(
            `[${totalProducts} items] Interaction Latency: ${latency.toFixed(2)}ms`
          );

          test.info().annotations.push({
            type: MetricType.INTERACTION_LATENCY,
            description: JSON.stringify({
              value: Number(latency.toFixed(2)),
              unit: "ms"
            })
          });
        });
      });

      test("Storage Footprint", async ({ page }) => {
        const searchPage = new SearchPage(page);

        // Arrange
        await test.step(`Load dataset (${totalProducts} products)`, async () => {
          await seedDatabase({
            categories: categoriesCount,
            productsPerCategory
          });
          await searchPage.goto();
        });

        // Act
        const estimate =
          await test.step("Retrieve storage estimate via CDP", async () => {
            const client = await page.context().newCDPSession(page);

            const origin = await page.evaluate(() => window.location.origin);

            try {
              // Request the usage and quota data from Chromium
              return await client.send("Storage.getUsageAndQuota", {
                origin
              });
            } catch (error) {
              console.error("CDP Storage API error:", error);
              return null;
            } finally {
              await client.detach();
            }
          });

        // Assert
        await test.step("Validate storage usage", () => {
          if (estimate) {
            const usageMB = estimate.usage / 1024 / 1024;
            console.log(
              `[${totalProducts} items] Storage Usage: ${usageMB} MB`
            );

            test.info().annotations.push({
              type: MetricType.STORAGE_USAGE,
              description: JSON.stringify({ value: usageMB, unit: "MB" })
            });

            if (process.env.APP_MODE !== "ssr") {
              expect(estimate.usage).toBeGreaterThan(0);
            }
          } else {
            console.log("Storage API not available or returned invalid data");
            test.info().annotations.push({
              type: MetricType.STORAGE_USAGE,
              description: JSON.stringify({
                value: "API Unavailable",
                unit: "error"
              })
            });
          }
        });
      });

      test("Client Resource Tax (Heap Memory)", async ({
        page,
        browserName
      }) => {
        test.skip(browserName !== "chromium", "CDP only supported in Chromium");

        const searchPage = new SearchPage(page);

        // Arrange: Just seed the database
        await test.step("Seed DB", async () => {
          await seedDatabase({
            categories: categoriesCount,
            productsPerCategory
          });
        });

        await test.step("Simulate user session", async () => {
          await searchPage.goto();
        });

        // Assert: Attach CDP and read metrics after the page is stable
        await test.step("Analyze JS Heap usage", async () => {
          const client = await page.context().newCDPSession(page);
          await client.send("Performance.enable");

          const metrics = await client.send("Performance.getMetrics");
          const jsHeapUsedNode = metrics.metrics.find(
            (m) => m.name === "JSHeapUsedSize"
          );

          if (jsHeapUsedNode) {
            const heapUsedMB = jsHeapUsedNode.value / 1024 / 1024;
            console.log(
              `[${totalProducts} items] JS Heap Used: ${heapUsedMB.toFixed(2)} MB`
            );

            test.info().annotations.push({
              type: MetricType.JS_HEAP_USED,
              description: JSON.stringify({
                value: Number(heapUsedMB.toFixed(2)),
                unit: "MB"
              })
            });

            expect(heapUsedMB).toBeGreaterThan(0);
            expect(heapUsedMB).toBeLessThan(
              categoriesCount * productsPerCategory * 0.2
            );
          }

          await client.detach();
        });
      });
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
    await test.step(`Verify cached load is faster than initial`, () => {
      console.log(
        `Initial Time: ${initialDuration.toFixed(2)}ms | Cached Time: ${cachedDuration.toFixed(2)}ms`
      );

      test.info().annotations.push(
        {
          type: MetricType.INITIAL_LOAD_TIME,
          description: JSON.stringify({
            value: Number(initialDuration.toFixed(2)),
            unit: "ms"
          })
        },
        {
          type: MetricType.CACHED_LOAD_TIME,
          description: JSON.stringify({
            value: Number(cachedDuration.toFixed(2)),
            unit: "ms"
          })
        }
      );

      expect(cachedDuration).toBeLessThan(initialDuration);

      if (!process.env.CI) {
        expect(cachedDuration).toBeLessThan(500);
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

    type ExtendedWindow = typeof window & {
      __longTaskCount: number;
      __totalLagTime: number;
    };

    // Inject a Performance Observer to track UI freezes (Long Tasks)
    await test.step("Setup lag detection", async () => {
      await page.evaluate(() => {
        const w = window as ExtendedWindow;
        w.__longTaskCount = 0;
        w.__totalLagTime = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            w.__longTaskCount++;
            w.__totalLagTime += entry.duration;
          }
        });
        // Start observing main thread blocking tasks
        observer.observe({ type: "longtask", buffered: true });
      });
    });

    // Perform a realistic scroll interaction to stress the virtualized list
    await test.step("Perform human-like scrolling", async () => {
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(150);
      }
    });

    // Assert that the application remained responsive
    await test.step("Verify application responsiveness", async () => {
      // Check custom lag metrics
      const metrics = await page.evaluate(() => {
        const w = window as ExtendedWindow;

        return {
          longTasks: w.__longTaskCount,
          totalLag: w.__totalLagTime
        };
      });

      console.log(
        `Scroll Performance: ${metrics.longTasks} lag spikes, ${metrics.totalLag.toFixed(0)}ms total lag.`
      );

      test.info().annotations.push(
        {
          type: MetricType.LAG_SPIKES,
          description: JSON.stringify({
            value: metrics.longTasks,
            unit: "count"
          })
        },
        {
          type: MetricType.TOTAL_SCROLL_LAG,
          description: JSON.stringify({
            value: Number(metrics.totalLag.toFixed(0)),
            unit: "ms"
          })
        }
      );

      // Assert that the UI didn't choke too badly.
      expect(metrics.longTasks).toBeLessThan(process.env.CI ? 15 : 5);

      // Fallback assert to ensure the page is still alive
      const title = await page.title();
      expect(title).toBeTruthy();
    });
  });
});
