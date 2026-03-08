import { expect, type Locator, type Page } from "@playwright/test";

export class NotificationPanelPage {
  readonly page: Page;
  readonly triggerBtn: Locator;
  readonly panel: Locator;
  readonly markAllReadBtn: Locator;
  readonly notificationList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.triggerBtn = page.locator('button[aria-label^="Notifications"]');
    // The Popover content panel
    this.panel = page.getByRole("dialog", { name: "Notifications Panel" });

    this.markAllReadBtn = page.getByRole("button", {
      name: "Mark all notifications as read"
    });

    // The scrollable container
    this.notificationList = page.getByRole("list", { name: "Notifications" });
  }

  async open() {
    if (!(await this.panel.isVisible())) {
      await this.triggerBtn.click();
    }
    await expect(this.panel).toBeVisible();
  }

  /**
   * Clicks a notification.
   */
  async clickNotification(textPattern: string | RegExp) {
    const notification = this.notificationList
      .getByRole("listitem")
      .filter({ hasText: textPattern })
      .first();

    await expect(notification).toBeVisible();
    await notification.click();
  }

  async markAllAsRead() {
    await expect(this.markAllReadBtn).toBeVisible();
    await this.markAllReadBtn.click();
  }

  async getUnreadCount(): Promise<number> {
    const label = await this.triggerBtn.getAttribute("aria-label");

    // Extract the digits using regex
    const match = label?.match(/(\d+)/);
    return match ? parseInt(match[0], 10) : 0;
  }

  async waitForUnreadCount(expectedCount: number): Promise<void> {
    // Dynamically create a regular expression based on the passed number
    const expectedPattern = new RegExp(
      `Notifications, ${expectedCount} unread`
    );

    // Playwright will automatically retry this until the condition is met, or it times out
    await expect(this.triggerBtn).toHaveAttribute(
      "aria-label",
      expectedPattern
    );
  }
}
