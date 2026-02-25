import { expect, type Page, type Locator } from "@playwright/test";

export class ProductPage {
  readonly page: Page;
  readonly addToCartBtn: Locator;
  readonly increaseQtyBtn: Locator;
  readonly decreaseQtyBtn: Locator;
  readonly wishlistBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addToCartBtn = page.getByTestId("main-add-to-cart");

    // Updated to match the exact, standardized aria-labels
    this.increaseQtyBtn = page.getByRole("button", {
      name: "Increase quantity",
      exact: true
    });
    this.decreaseQtyBtn = page.getByRole("button", {
      name: "Decrease quantity",
      exact: true
    });

    // New locator targeting the accessible toggle button
    this.wishlistBtn = page.getByRole("button", {
      name: "Wishlist",
      exact: true
    });
  }

  /**
   * Dynamically gets the quantity input based on the product name.
   * Useful since the aria-label now explicitly links to the product.
   */
  getQuantityInput(productName: string) {
    return this.page.getByRole("spinbutton", {
      name: `Quantity for ${productName}`
    });
  }

  /**
   * Dynamically targets the new semantic volume discount buttons.
   */
  getVolumeDiscountTier(minQuantity: number) {
    return this.page.getByRole("button", {
      name: new RegExp(`Buy ${minQuantity}\\+`)
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

  async selectVolumeDiscount(minQuantity: number) {
    const tierBtn = this.getVolumeDiscountTier(minQuantity);
    await tierBtn.click();
    await expect(tierBtn).toHaveAttribute("aria-pressed", "true");
  }

  async verifyWishlistState(isWishlisted: boolean) {
    await expect(this.wishlistBtn).toHaveAttribute(
      "aria-pressed",
      String(isWishlisted)
    );
  }
}
