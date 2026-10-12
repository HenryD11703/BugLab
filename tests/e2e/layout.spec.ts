import { expect, test, type Page } from "@playwright/test";
import { EX_004, openStep } from "./helpers";

// AC-07: a 375 px wide phone, no horizontal scrolling, a usable editor.
test.use({ viewport: { width: 375, height: 812 } });
test.skip(({ isMobile }) => isMobile, "this spec sets its own 375 px viewport");

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("phone layout (375 px)", () => {
  test("home has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="/exercise/"]').first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the exercise page has two tabs, Read and Work, and neither scrolls sideways", async ({ page }) => {
    await page.goto(EX_004);
    await expect(page.getByRole("tab", { name: "Read", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Predict/ })).toBeHidden(); // the steps live in Work
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await page.getByRole("tab", { name: "Work", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
    for (const step of ["Predict", "Locate", "Explain", "Fix"] as const) {
      await openStep(page, step);
      expect(await overflow(page), `${step} overflows`).toBeLessThanOrEqual(0);
    }
  });

  test("the editor has room to write in, and Run is reachable", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Fix");
    const box = await page.locator(".cm-editor").boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(300);
    expect(box!.height).toBeGreaterThanOrEqual(200);
    const runBox = await page.getByRole("button", { name: /^Run/ }).boundingBox();
    expect(runBox!.x).toBeGreaterThanOrEqual(0);
    expect(runBox!.x + runBox!.width).toBeLessThanOrEqual(375);
    expect(runBox!.height).toBeGreaterThanOrEqual(34); // a tappable size
  });

  test("a traceback and long test output wrap or scroll inside their own box", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Fix");
    await page.getByText("python ready").waitFor({ timeout: 60_000 });
    await page.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText("def append_to(element, to=None):\n    return to.some_attribute_with_a_very_long_name_that_does_not_exist\n");
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByText(/AttributeError/).first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
