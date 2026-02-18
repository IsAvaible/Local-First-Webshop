import { test, expect } from "@playwright/test";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { db } from "../src/db/connection";

test.describe("Shopping Cart User Journey", () => {
  let productPage: ProductPage;
  let cartPage: CartPage;

  test.beforeEach(({ page }) => {
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
  });

  test("User can manage cart lifecycle and proceed to checkout", async ({
    page
  }) => {
    const products = await db.query.productsTable.findMany({ limit: 2 });

    if (products === undefined) {
      throw Error("Database is not seeded");
    }

    await test.step("Add item to cart", async () => {
      await productPage.goto(String(products[0].id));
      await productPage.addItemToCart();
    });

    await test.step("Verify item and update quantity", async () => {
      await cartPage.goto();
      await cartPage.verifyItemVisible(products[0].name);
      await cartPage.setItemQuantity(products[0].name, "2");
    });

    await test.step("Remove item and verify empty state", async () => {
      await cartPage.removeItem(products[0].name);
      await expect(cartPage.emptyCartMsg).toBeVisible();
    });

    // Checkout Flow
    await test.step("Add other item and proceed to checkout", async () => {
      await productPage.goto(String(products[1].id));
      await productPage.addItemToCart();

      await cartPage.goto();
      await cartPage.verifyItemVisible(products[1].name);
      await cartPage.checkoutBtn.click();
      await expect(page).toHaveURL(/\/checkout/);
    });
  });
});
