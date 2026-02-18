import { test, expect } from "@playwright/test";

test("loads main content", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Partslist" })).toBeVisible();
});
