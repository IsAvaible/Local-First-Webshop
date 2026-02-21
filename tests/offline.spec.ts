import { expect } from "@playwright/test";
import { throttledTest as test } from "./setup/test-setup";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { SearchPage } from "./pages/SearchPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { db } from "@/db/connection.ts";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

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

  test("Sync Recovery Stress Test", async ({ page }) => {
    const searchPage = new SearchPage(page);
    const productPage = new ProductPage(page);
    const mutationCount = 20;

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

      // Increase quantity (since main button is now disabled)
      for (let i = 1; i < mutationCount; i++) {
        await productPage.increaseQtyBtn.click();
      }
    });

    await test.step("Verification: Go Online and measure recovery", async () => {
      const start = performance.now();

      // Restore connection
      await page.context().setOffline(false);

      // Measure Recovery via UI Badge update
      await expect(async () => {
        await productPage.verifyCartBadgeCount(mutationCount);
      }).toPass({ timeout: 15000 });

      const duration = performance.now() - start;
      console.log(
        `Sync Recovery Time for ${mutationCount} mutations: ${duration}ms`
      );
    });
  });

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

      // Verify restoration using the POM badge check
      await productPage.verifyCartBadgeCount(1, { timeout: 10000 });
    });
  });
});
