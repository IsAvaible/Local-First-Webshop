import { expect, type Locator, type Page } from "@playwright/test";

export class CartPage {
  readonly page: Page;
  readonly checkoutBtn: Locator;
  readonly emptyCartMsg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkoutBtn = page.getByRole("button", { name: "Checkout" });
    this.emptyCartMsg = page.getByText("Your cart is empty");
  }

  async goto() {
    await this.page.goto("/cart");
    await expect(this.checkoutBtn).toBeVisible();
  }

  async verifyItemVisible(itemName: string) {
    await expect(this.getItemRow(itemName)).toBeVisible();
  }

  /**
   * Helper to find a specific cart item row based on the item name.
   */
  private getItemRow(itemName: string): Locator {
    return this.page.getByRole("group", { name: `Cart item: ${itemName}` });
  }

  async setItemQuantity(itemName: string, quantity: string) {
    const itemRow = this.getItemRow(itemName);

    const input = itemRow.getByLabel(`Quantity of ${itemName}`);

    await input.fill(quantity);
    await input.blur();
    await expect(input).toHaveValue(quantity);
  }

  async removeItem(itemName: string) {
    const itemRow = this.getItemRow(itemName);

    await itemRow
      .getByRole("button", { name: `Remove ${itemName} from cart` })
      .click();
  }
}
