import { expect, type Page } from "@playwright/test";

/** Waits for the Python runtime. Generous: many tests download it at once. */
export const waitForPython = (page: Page) =>
  expect(page.getByText("python ready")).toBeVisible({ timeout: 60_000 });

/** Replaces the editor content and waits until the page has seen the edit. */
export async function setCode(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
  await expect(editor).toContainText(code.split("\n")[0]);
}

export const run = (page: Page) =>
  page.getByRole("button", { name: /^(Run|Running|Loading Python)/ }).click();
