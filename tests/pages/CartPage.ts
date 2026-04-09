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
  public getItemRow(itemName: string): Locator {
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
    return this.page.getByTestId("folder-container").filter({
      has: this.page.getByRole("button", {
        name: `Delete ${folderName} folder`,
        exact: true
      })
    });
  }

  async deleteFolder(folderName: string) {
    await this.page
      .getByRole("button", { name: `Delete ${folderName} folder`, exact: true })
      .click();
  }
  /**
   * Uses keyboard navigation to interact with dnd-kit's KeyboardSensor.
   * Focuses the item, picks it up with Space, moves it with Arrow keys, and drops it.
   */
  async dragItemToFolder(itemName: string, folderName: string) {
    const allHandles = this.page.getByRole("button", {
      name: `Reorder ${itemName}`
    });
    const sourceHandle = allHandles.first();
    const targetFolder = this.getFolderLocator(folderName).first();

    // Focus the drag handle and pick up the item
    await sourceHandle.focus();
    await this.page.keyboard.press("Space");

    // Briefly wait for dnd-kit to mount the DragOverlay
    await this.page.waitForTimeout(250);

    // The DragOverlay is now mounted. The overlay handle will be the last matching element.
    const overlayHandle = allHandles.last();

    const maxSteps = 30; // Safety break to prevent infinite loops

    for (let i = 0; i < maxSteps; i++) {
      const overlayBox = await overlayHandle.boundingBox();
      const folderBox = await targetFolder.boundingBox();

      if (!overlayBox || !folderBox) {
        throw new Error(
          `Overlay or folder bounding box not found during drag.`
        );
      }

      // Calculate the center Y of the dragging item for a more accurate hit area
      const overlayCenterY = overlayBox.y + overlayBox.height / 2;

      // 3. Check if the center of the drag overlay is within the folder's vertical bounds
      const isInsideFolder =
        overlayCenterY >= folderBox.y &&
        overlayCenterY <= folderBox.y + folderBox.height;

      console.log(overlayCenterY, folderBox);

      if (isInsideFolder) {
        break; // Target reached
      }

      // 4. Dynamically determine which way to move based on real-time positions
      // We aim slightly below the top of the folder box (folderBox.y)
      const moveKey = overlayCenterY < folderBox.y ? "ArrowDown" : "ArrowUp";

      await this.page.keyboard.press(moveKey);

      // Wait for React to re-render the sortable context and apply layout shifts
      await this.page.waitForTimeout(200);
    }

    // Drop the item into place
    await this.page.keyboard.press("Space");

    // Wait for the drop animation to finish settling
    await this.page.waitForTimeout(250);
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
    await expect(this.shareEmailInput).toBeEmpty();

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

    await folder
      .getByRole("button", { name: `Rename folder: ${oldName}` })
      .click();

    const renameInput = folder.getByRole("textbox", {
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
    const syncIndicator = this.page.getByRole("status", {
      name: "Connection status: connected"
    });

    await expect(syncIndicator).toBeAttached({ timeout: 10000 });
  }

  /**
   * Asserts the cart is entirely empty.
   */
  async assertEmpty() {
    await expect(this.emptyCartMsg).toBeVisible();
  }
}
