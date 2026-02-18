import { expect, type Page, type Locator } from "@playwright/test";

export class ProductPage {
  readonly page: Page;
  readonly addToCartBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addToCartBtn = page.getByTestId("main-add-to-cart");
  }

  async goto(productId: string) {
    await this.page.goto(`/products/${productId}`);
    await expect(this.addToCartBtn).toBeVisible();
  }

  async addItemToCart() {
    await this.addToCartBtn.click();
    await expect(this.addToCartBtn).toHaveText("Already in Cart");
  }
}
