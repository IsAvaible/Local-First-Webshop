import { expect, type Locator, type Page } from "@playwright/test";

export class CheckoutPage {
  readonly page: Page;
  readonly enterFlowBtn: Locator;
  readonly errorMsg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.enterFlowBtn = page.getByRole("button", {
      name: "Proceed to Payment"
    });
    this.errorMsg = page.getByText(/Error|Issue|Unavailable/i);
  }

  async enterCheckoutFlow() {
    await this.enterFlowBtn.click();
  }

  async goto() {
    await this.page.goto("/checkout");
  }

  async expectErrorMessage() {
    await expect(this.errorMsg).toBeVisible();
  }
}
