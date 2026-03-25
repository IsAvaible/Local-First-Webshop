import { expect, type Locator, type Page } from "@playwright/test";
import type { CartRole } from "@/db/schema.ts";

export class CartPage {
  readonly page: Page;
  readonly checkoutBtn: Locator;
  readonly emptyCartMsg: Locator;
  readonly addFolderBtn: Locator;

  readonly shareBtn: Locator;
  readonly shareEmailInput: Locator;
  readonly shareSendBtn: Locator;
  readonly shareRoleTrigger: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkoutBtn = page.getByRole("button", { name: "Checkout" });
    this.emptyCartMsg = page.getByText("Your cart is empty.");
    this.addFolderBtn = page.getByRole("button", { name: "Add Folder" });

    this.shareBtn = page.getByRole("button", { name: "Share" });
    this.shareEmailInput = page.getByPlaceholder("Add people via email");
    this.shareSendBtn = page.getByRole("button", { name: "Send" });
    this.shareRoleTrigger = page.getByRole("combobox", {
      name: "Role for new collaborator"
    });
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

  async addFolder() {
    await this.addFolderBtn.click();
  }

  getFolderLocator(folderName: string): Locator {
    // Assumes the folder text is visible on the screen
    return this.page.getByText(folderName, { exact: true });
  }

  async deleteFolder(folderName: string) {
    await this.page
      .getByRole("button", { name: `Delete ${folderName} folder`, exact: true })
      .click();
  }
  /**
   * Manually dispatches mouse events to satisfy dnd-kit's sensor requirements.
   * Homing sequence: recalculates target position during the move to account for dynamic layout shifts.
   */
  async dragItemToFolder(itemName: string, folderName: string) {
    const dragHandle = this.page.getByRole("button", {
      name: `Reorder ${itemName}`
    });

    const targetFolderTitle = this.getFolderLocator(folderName);

    // Hover over the drag handle and grab it
    await dragHandle.hover();
    await this.page.mouse.down();

    // Trigger dnd-kit's PointerSensor activation constraint
    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) throw new Error(`Drag handle for ${itemName} not visible.`);

    let currentX = handleBox.x + handleBox.width / 2;
    let currentY = handleBox.y + handleBox.height / 2;

    // Initial nudge to activate the dnd-kit drag state
    currentX += 10;
    currentY += 10;
    await this.page.mouse.move(currentX, currentY);

    // Briefly wait for dnd-kit to mount the DragOverlay and trigger initial layout shifts
    await this.page.waitForTimeout(100);

    // Homing sequence: move in segments, recalculating the moving target each time
    const segments = 5;
    for (let i = 1; i <= segments; i++) {
      // Recalculate target position (with offset to drop below the folder title)
      const titleBox = await targetFolderTitle.boundingBox();
      if (!titleBox)
        throw new Error(`Target folder ${folderName} not visible during drag.`);
      const targetX = titleBox.x + titleBox.width / 2;
      const targetY = titleBox.y + titleBox.height + 20;

      // Calculate fraction of remaining distance to travel
      const progress = 1 / (segments - i + 1);
      currentX = currentX + (targetX - currentX) * progress;
      currentY = currentY + (targetY - currentY) * progress;

      // Move to the waypoint
      await this.page.mouse.move(currentX, currentY, { steps: 5 });

      // Wait for layout to stabilize before the next segment
      await this.page.waitForTimeout(50);
    }

    // Drop the item
    await this.page.mouse.up();
  }

  /**
   * Retrieves the email address of the current logged-in user
   * from the "People with access" list in the Share Dialog.
   */
  async getCurrentUserEmail(): Promise<string> {
    // Open the dialog if it's not already visible
    if (!(await this.shareEmailInput.isVisible())) {
      await this.shareBtn.click();
    }

    // Locate the container holding the current user's info.
    const currentUserRow = this.page
      .locator("div")
      .filter({
        hasText: /\(you\)/
      })
      .last();

    // Extract the email
    const emailText = await currentUserRow
      .locator("span", { hasText: "Email:" })
      .first()
      .textContent();

    if (emailText === null) {
      throw new Error("Current user's email not found in Share Dialog.");
    }

    const email = emailText?.replace("Email:", "").trim();

    await this.page.keyboard.press("Escape");

    return email;
  }

  /**
   * Invites a user to the cart via the Share Dialog.
   */
  async shareWithEmail(email: string, role: CartRole) {
    await this.shareBtn.click();
    await this.shareEmailInput.fill(email);

    await this.shareRoleTrigger.click();
    const roleName = role.charAt(0).toUpperCase() + role.slice(1);
    await this.page.getByRole("option", { name: roleName }).click();

    await this.shareSendBtn.click();

    await this.page.keyboard.press("Escape");
    await expect(this.shareEmailInput).toBeHidden();
  }

  /**
   * Locates a collaborator's email within the Share Dialog.
   */
  async getCollaboratorEmailLocator(email: string) {
    await this.shareBtn.click();

    const mail = this.page
      .getByRole("dialog")
      .getByText(email, { exact: true });

    await this.page.keyboard.press("Escape");

    return mail;
  }

  /**
   * Renames a folder.
   */
  async renameFolder(oldName: string, newName: string) {
    const folder = this.getFolderLocator(oldName);

    // Trigger edit mode
    await folder.click();

    // Locate the input that appears
    const renameInput = this.page.getByRole("textbox", {
      name: `Rename folder ${oldName}`
    });
    await renameInput.fill(newName);
    await renameInput.press("Enter");

    await expect(this.getFolderLocator(newName)).toBeVisible();
  }

  /**
   * Hovers over the sync indicator and waits for the specific tooltip.
   */
  async waitForSync() {
    // We target the tooltip trigger container which houses the Wifi icon.
    const syncIndicator = this.page.locator(".lucide-wifi").first();

    // Radix Tooltips require hover/focus to attach to the DOM
    await syncIndicator.hover();

    const tooltip = this.page.getByRole("tooltip", {
      name: /Connected to sync server/i
    });
    await expect(tooltip).toBeAttached({ timeout: 10000 });

    // Move mouse away to dismiss tooltip so it doesn't block future interactions
    await this.page.mouse.move(0, 0);
  }

  /**
   * Asserts the cart is entirely empty.
   */
  async assertEmpty() {
    await expect(this.emptyCartMsg).toBeVisible();
  }
}
