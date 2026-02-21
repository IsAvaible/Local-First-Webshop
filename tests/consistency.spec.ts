import { test, expect } from "@playwright/test";
import { resetDatabase, seedDatabase } from "./utils/db-helpers";
import { db } from "@/db/connection.ts";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { SearchPage } from "./pages/SearchPage.ts";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/routes/api/trpc/$.ts";
import type { TrpcRequestEnvelope, TrpcResponseEnvelope } from "@/lib/utils.ts";

test.describe("Consistency & Conflict Tests", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  // test("The 'Inventory Race': Offline vs Online User", async ({ browser }) => {
  //   await seedDatabase({ categories: 1, productsPerCategory: 1 });
  //   const products = await db.query.productsTable.findMany();
  //   const targetProduct = products[0];
  //
  //   const contextA = await browser.newContext(); // Offline user
  //   const contextB = await browser.newContext(); // Online user
  //
  //   const pageA = await contextA.newPage();
  //   const pageB = await contextB.newPage();
  //
  //   const productPageA = new ProductPage(pageA);
  //   const productPageB = new ProductPage(pageB);
  //   const cartPageA = new CartPage(pageA);
  //   const cartPageB = new CartPage(pageB);
  //   const checkoutPageA = new CheckoutPage(pageA);
  //   const checkoutPageB = new CheckoutPage(pageB);
  //
  //   // 1. Both users view the product
  //   await Promise.all([
  //     productPageA.goto(targetProduct.id),
  //     productPageB.goto(targetProduct.id)
  //   ]);
  //
  //   // 2. User A goes offline and adds to cart
  //   await contextA.setOffline(true);
  //   await productPageA.addToCartBtn.click();
  //
  //   // Verify via POM or direct expectation if POM doesn't have cart badge helper
  //   // Assuming CartPage might have a way to check header badge or we just check text
  //   // ProductPage doesn't have badge check.
  //   await expect(pageA.getByText("1", { exact: true })).toBeVisible();
  //
  //   // 3. User B (Online) buys the item
  //   await productPageB.addToCartBtn.click();
  //   await cartPageB.goto();
  //   await cartPageB.checkoutBtn.click();
  //
  //   // Simulate "Sold Out" by deleting item
  //   await db
  //     .delete(schema.productsTable)
  //     .where(eq(schema.productsTable.id, targetProduct.id));
  //
  //   // 4. User A comes back online and tries to check out
  //   await contextA.setOffline(false);
  //   await cartPageA.goto();
  //
  //   await expect(async () => {
  //     await cartPageA.checkoutBtn.click();
  //     await checkoutPageA.expectErrorMessage();
  //   }).toPass();
  //
  //   await contextA.close();
  //   await contextB.close();
  // });

  test("Time to Consistency", async ({ page }) => {
    const MAX_CONSISTENCY_DELAY_MS = 3000;
    const NEW_PRODUCT_NAME = "Synced Name Verify";

    const searchPage = new SearchPage(page);

    // Seed and find a target product
    await seedDatabase({ categories: 1, productsPerCategory: 1 });
    const products = await db.query.productsTable.findMany();
    const targetProduct = products[0];

    await test.step("Navigate to search results", async () => {
      await searchPage.goto();
    });

    await test.step("Go offline and perform server-side update", async () => {
      await page.context().setOffline(true);

      // Simulate a background process or another user updating the DB
      await db
        .update(schema.productsTable)
        .set({ name: NEW_PRODUCT_NAME })
        .where(eq(schema.productsTable.id, targetProduct.id));
    });

    await test.step("Verify stale data persists while offline", async () => {
      await expect(searchPage.productCards.first()).not.toContainText(
        NEW_PRODUCT_NAME
      );
    });

    await test.step("Reconnect and measure sync time", async () => {
      const startTime = performance.now();

      // Go Online
      await page.context().setOffline(false);

      // Wait for the UI to reflect the new name
      await expect(page.getByText(NEW_PRODUCT_NAME)).toBeVisible({
        timeout: 10000
      });

      const duration = performance.now() - startTime;
      console.log(`Time to Consistency: ${duration}ms`);

      expect(duration).toBeLessThan(MAX_CONSISTENCY_DELAY_MS);
    });
  });

  test("Server Gatekeeper: Reject Malicious Payload Interception", async ({
    page
  }) => {
    type OrderUpsertInput = inferRouterInputs<AppRouter>["orders"]["upsert"];
    type OrderUpsertOutput = inferRouterOutputs<AppRouter>["orders"]["upsert"];

    await seedDatabase({ categories: 1, productsPerCategory: 1 });
    const products = await db.query.productsTable.findMany();
    const targetProduct = products[0];

    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await test.step("Add valid item to cart", async () => {
      await productPage.goto(targetProduct.id);
      await productPage.addItemToCart(); // Used the POM method which includes verification
    });

    await test.step("Navigate to checkout", async () => {
      await cartPage.goto();
      await cartPage.verifyItemVisible(targetProduct.name);
      await cartPage.checkoutBtn.click();
    });

    let orderResponsePayload:
      | TrpcResponseEnvelope<OrderUpsertOutput>
      | undefined;

    await test.step("Attempt Malicious Checkout (Network Interception)", async () => {
      // Set up a route handler to intercept the checkout POST request.
      await page.route("**/api/trpc/orders.upsert", async (route) => {
        const postData = route
          .request()
          .postDataJSON() as TrpcRequestEnvelope<OrderUpsertInput>;

        // Attempt to force price to 0
        if (postData.json.items && postData.json.items.length > 0) {
          // @ts-expect-error The Client can't actually send price, but we're simulating a malicious client that tries to
          postData.json.items[0].price = 0;
        }

        // Continue the request with the modified (malicious) data
        await route.continue({ postData });
      });

      const [response] = await Promise.all([
        page.waitForResponse((res) =>
          res.url().includes("/api/trpc/orders.upsert")
        ),
        checkoutPage.enterCheckoutFlow()
      ]);

      // trpc wraps the response in an array, even for single item responses. This is a quirk of how the client handles batching.
      orderResponsePayload = (
        (await response.json()) as (typeof orderResponsePayload)[]
      )[0];
    });

    await test.step("Verify Order", () => {
      expect(orderResponsePayload).toBeDefined();

      if (!orderResponsePayload) return;

      // Extract the calculated subtotal from the server response
      const responseSubtotal: string =
        orderResponsePayload.result.data.json.breakdown.subtotal;

      expect(Number(responseSubtotal)).not.toBe(0);
    });
  });
});
