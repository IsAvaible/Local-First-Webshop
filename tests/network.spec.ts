import { expect } from "@playwright/test";
import { throttledTest as test } from "./setup/test-setup";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { db } from "@/db/connection.ts";
import * as schema from "@/db/schema";
import { SearchPage } from "./pages/SearchPage";
import { ProductPage } from "./pages/ProductPage";
import { eq } from "drizzle-orm";
import { MetricType } from "./utils/metrics-reporter.ts";

test.describe("Network Efficiency Tests", { tag: "@metric" }, () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("Bandwidth Consumption (Home -> Search -> Product)", async ({
    page
  }) => {
    // Shared state for the steps
    let totalBytes = 0;
    const searchPage = new SearchPage(page);
    const productPage = new ProductPage(page);

    await test.step("Setup: Seed DB and Start Network Monitor", async () => {
      await seedDatabase({ categories: 5, productsPerCategory: 10 });

      page.on("requestfinished", async (request) => {
        const sizes = await request.sizes();
        totalBytes +=
          sizes.requestBodySize +
          sizes.responseBodySize +
          sizes.responseHeadersSize;
      });
    });

    await test.step("Step 1: Load Home Page", async () => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Partslist" })
      ).toBeVisible();

      const homeKb = (totalBytes / 1024).toFixed(2);
      console.log(`Bandwidth after Home Load: ${homeKb} KB`);
      test.info().annotations.push({
        type: MetricType.BANDWIDTH_HOME_LOAD,
        description: JSON.stringify({ value: Number(homeKb), unit: "KB" })
      });
    });

    await test.step("Step 2: Navigate to Search Page", async () => {
      const initialBytesBeforeNav = totalBytes;

      await searchPage.goto();

      const searchKb = ((totalBytes - initialBytesBeforeNav) / 1024).toFixed(2);
      console.log(`Bandwidth for Search Navigation: ${searchKb} KB`);
      test.info().annotations.push({
        type: MetricType.BANDWIDTH_SEARCH_NAV,
        description: JSON.stringify({ value: Number(searchKb), unit: "KB" })
      });
    });

    await test.step("Step 3: Navigate to Product Page", async () => {
      const productBytesStart = totalBytes;

      await searchPage.productCards.first().click();
      await expect(page).toHaveURL(/product/);
      await expect(productPage.addToCartBtn).toBeVisible();

      const productKb = ((totalBytes - productBytesStart) / 1024).toFixed(2);
      console.log(`Bandwidth for Product Navigation: ${productKb} KB`);
      test.info().annotations.push({
        type: MetricType.BANDWIDTH_PRODUCT_NAV,
        description: JSON.stringify({ value: Number(productKb), unit: "KB" })
      });
    });
  });

  test("Delta Update Payload", async ({ page }) => {
    test.skip(
      process.env.APP_MODE === "ssr",
      "SSR does not support automatic delta syncs; requires manual reload."
    );

    const searchPage = new SearchPage(page);
    const updatedName = "Updated Product Name For Delta Test";

    await test.step("Setup: Seed DB and Navigate", async () => {
      await seedDatabase({ categories: 1, productsPerCategory: 1 });
      await searchPage.goto();
    });

    await test.step("Trigger Server-Side DB Update & Catch HTTP Payload", async () => {
      console.log("Triggering server-side update...");
      const [product] = await db.select().from(schema.productsTable).limit(1);

      if (!product) throw new Error("No product found");

      // Set up the listener before triggering the action to prevent race conditions
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes("/api/products") && res.status() === 200
      );

      // Perform the DB Update
      await db
        .update(schema.productsTable)
        .set({ name: updatedName })
        .where(eq(schema.productsTable.id, product.id));

      // Await the specific network response
      const deltaResponse = await responsePromise;

      // Verify we captured the correct response and not a heartbeat ("up-to-date")
      const json = (await deltaResponse.json()) as JSON;
      expect(JSON.stringify(json)).toContain(updatedName);

      const payload = await deltaResponse.body();
      console.log(`Update received. Payload size: ${payload.byteLength} bytes`);
      test.info().annotations.push({
        type: MetricType.DELTA_UPDATE_PAYLOAD_SIZE,
        description: JSON.stringify({
          value: payload.byteLength,
          unit: "bytes"
        })
      });

      expect(deltaResponse).toBeDefined();
    });

    await test.step("Verify UI Update", async () => {
      await expect(searchPage.productCards.first()).toContainText(updatedName);
    });
  });
});
