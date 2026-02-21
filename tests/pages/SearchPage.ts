import { expect, type Locator, type Page } from "@playwright/test";

export class SearchPage {
  readonly page: Page;
  readonly productCards: Locator;
  readonly desktopFilterArea: Locator;
  readonly mobileFilterButton: Locator;
  readonly mobileFilterDialog: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productCards = page.getByTestId("product-card");

    // Desktop layout
    this.desktopFilterArea = page.getByRole("region", { name: "Filters" });

    // Mobile layout
    this.mobileFilterButton = page.getByRole("button", { name: "Filter" });
    this.mobileFilterDialog = page.getByRole("dialog");
  }

  async goto() {
    await this.page.goto("/search");
    await expect(this.productCards.first()).toBeVisible();
  }

  async getProductCount() {
    return await this.productCards.count();
  }

  /**
   * Checks if the viewport matches the mobile threshold defined in Browse.tsx (<= 1536px).
   */
  private isMobile(): boolean {
    const viewport = this.page.viewportSize();
    return viewport !== null && viewport.width <= 1536;
  }

  /**
   * Dynamically returns the active filter container based on viewport.
   */
  private get filterArea(): Locator {
    return this.isMobile() ? this.mobileFilterDialog : this.desktopFilterArea;
  }

  /**
   * Opens the filter dialog if on a mobile viewport.
   */
  async openFilters() {
    if (this.isMobile()) {
      await this.mobileFilterButton.click();
      await this.mobileFilterDialog.waitFor({ state: "visible" });
    }
  }

  /**
   * Closes the filter dialog if on a mobile viewport.
   */
  async closeFilters() {
    if (this.isMobile()) {
      await this.page.keyboard.press("Escape");
      await this.mobileFilterDialog.waitFor({ state: "hidden" });
    }
  }

  /**
   * Toggles a category by its user-facing label text.
   */
  async toggleCategory(
    categoryName: string,
    args: {
      beforeToggleCallback?: () => void | Promise<void>;
      afterToggleCallback?: () => void | Promise<void>;
    } = {}
  ) {
    await this.openFilters();

    const label = this.filterArea.locator("label").filter({
      has: this.page.getByText(categoryName, { exact: true })
    });

    const categoryInnerDiv = label.locator("..");

    const checkbox = categoryInnerDiv.getByRole("checkbox");
    await args.beforeToggleCallback?.();
    await checkbox.click();
    await args.afterToggleCallback?.();

    await this.closeFilters();
  }

  /**
   * Sets the price range.
   * Note: Filter.tsx has a 500ms debounce on these inputs!
   */
  async setPriceRange(min: string, max: string) {
    await this.openFilters();

    await this.filterArea.getByPlaceholder("Min").fill(min);
    await this.filterArea.getByPlaceholder("Max").fill(max);

    await this.closeFilters();
  }
}
