import { expect, test } from "@playwright/test";

test("home page lists the exercises", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const links = page.locator('a[href^="/exercise/"]');
  await expect(links.first()).toBeVisible();
  expect(await links.count()).toBeGreaterThanOrEqual(20);
});
