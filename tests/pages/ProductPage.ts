import { expect, type Page, type Locator } from "@playwright/test";

export class ProductPage {
  readonly page: Page;
  readonly addToCartBtn: Locator;
  readonly increaseQtyBtn: Locator;
  readonly decreaseQtyBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addToCartBtn = page.getByTestId("main-add-to-cart");
    this.increaseQtyBtn = page.getByRole("button", {
      name: /Increase quantity .+/
    });
    this.decreaseQtyBtn = page.getByRole("button", {
      name: /Decrease quantity .+/
    });
  }

  async goto(productId: string | number) {
    await this.page.goto(`/products/${productId}`);
    await expect(this.addToCartBtn).toBeVisible();
  }

  async addItemToCart() {
    await this.addToCartBtn.click();
    await this.verifyAlreadyInCart();
  }

  async verifyAlreadyInCart() {
    await expect(this.addToCartBtn).toContainText("Already in Cart");
    await expect(this.addToCartBtn).toBeDisabled();
  }

  async verifyCartBadgeCount(count: number, options?: { timeout?: number }) {
    const badge = this.page.getByText(String(count), { exact: true });
    await expect(badge).toBeVisible(options);
  }
}
