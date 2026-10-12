import { expect, test } from "@playwright/test";
import { EX_004, FIXED_004, tabTo, waitForPython } from "./helpers";

// Phones have no keyboard flow to test; the desktop project covers it.
test.skip(({ isMobile }) => isMobile, "keyboard flow is a desktop concern");

test("a whole exercise can be done with the keyboard only", async ({ page }) => {
  await page.goto(EX_004);

  // Predict: type into the answer, Enter submits
  await tabTo(page, (el) => el.tagName === "INPUT" && (el.getAttribute("placeholder") ?? "").startsWith("type the output"));
  await page.keyboard.type("[1, 2]");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^Right\./)).toBeVisible();
  await tabTo(page, (el) => (el.textContent ?? "").startsWith("Continue to Locate"));
  await page.keyboard.press("Enter");

  // Locate: lines are buttons
  await expect(page.getByRole("tab", { name: /Locate/ })).toHaveAttribute("aria-selected", "true");
  await tabTo(page, (el) => (el.getAttribute("aria-label") ?? "").startsWith("Line 1:"));
  await page.keyboard.press("Space");
  await tabTo(page, (el) => (el.textContent ?? "").startsWith("Check line"));
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^Found it\./)).toBeVisible();
  await tabTo(page, (el) => (el.textContent ?? "").startsWith("Continue to Explain"));
  await page.keyboard.press("Enter");

  // Explain: pick the second option, then check
  await tabTo(page, (el) => el.getAttribute("role") === "radio" && (el.textContent ?? "").includes("created once"));
  await page.keyboard.press("Space");
  await tabTo(page, (el) => el.tagName === "BUTTON" && el.textContent === "Check");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/That is the reason/)).toBeVisible();
  await tabTo(page, (el) => (el.textContent ?? "").startsWith("Continue to Fix"));
  await page.keyboard.press("Enter");

  // Fix: type in the editor, Ctrl+Enter runs
  await waitForPython(page);
  await tabTo(page, (el) => el.classList.contains("cm-content"));
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(FIXED_004);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByText("4 passed")).toBeVisible({ timeout: 30_000 });
  // Ctrl+Enter must not have added a blank line to the code
  await expect(page.locator(".cm-line")).toHaveCount(FIXED_004.split("\n").length);
});

test("the editor does not trap the keyboard: Escape then Tab leaves it", async ({ page }) => {
  await page.goto(EX_004);
  await page.getByRole("tab", { name: /Fix/ }).click();
  await page.locator(".cm-content").click();

  // Tab indents while typing...
  await page.keyboard.press("Control+A");
  await page.keyboard.type("x");
  await page.keyboard.press("Tab");
  await expect(page.locator(".cm-content")).toContainText("x    ");

  // ...and Escape then Tab moves on
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  const insideEditor = await page.evaluate(() => Boolean(document.activeElement?.closest(".cm-editor")));
  expect(insideEditor).toBe(false);
});

test("focus is always visible", async ({ page }) => {
  await page.goto(EX_004);
  await tabTo(page, (el) => (el.textContent ?? "").startsWith("hint 1"));
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { style: s.outlineStyle, width: s.outlineWidth };
  });
  expect(outline.style).not.toBe("none");
  expect(parseFloat(outline.width)).toBeGreaterThan(0);
});
