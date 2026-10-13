import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { EX_004, openRead, openStep, setCode, waitForPython } from "./helpers";

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("accessibility (axe: no serious or critical issues)", () => {
  test("home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="/exercise/"]').first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("home page with progress", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "buglab:progress",
        JSON.stringify({ version: 2, exercises: { "001-off-by-one": { hintsOpened: 1, done: { predict: true, fix: true } } } })
      );
    });
    await page.goto("/");
    await expect(page.getByText("1 of 20 solved")).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("exercise: instructions, hints and the unlocked solution", async ({ page }) => {
    await page.goto(EX_004);
    await openRead(page);
    for (const n of [1, 2, 3]) await page.getByRole("button", { name: new RegExp(`^hint ${n}`) }).click();
    await page.getByRole("button", { name: "show solution" }).click();
    await expect(page.getByRole("group", { name: "Reference solution" })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("exercise: predict, locate and explain", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[2]");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/Not quite/)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await openStep(page, "Locate");
    await page.getByRole("button", { name: /^Line 1/ }).click();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole("button", { name: /^Check line/ }).click();
    await expect(page.getByText(/^Found it\./)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await openStep(page, "Explain");
    await page.getByRole("radio").nth(1).click();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("exercise: fix, with failing tests, a traceback and a solved state", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Fix");
    await waitForPython(page);
    expect(await seriousViolations(page)).toEqual([]);

    const run = page.getByRole("button", { name: /^Run/ });
    await setCode(page, "def append_to(element, to=None):\n    return to.length\n");
    await run.click();
    await expect(page.getByText(/AttributeError/).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await setCode(page, "def append_to(element, to=None):\n    if to is None:\n        to = [0]\n    to.append(element)\n    return to\n");
    await run.click();
    await expect(page.getByText(/failed/).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await setCode(page, "def append_to(element, to=None):\n    if to is None:\n        to = []\n    to.append(element)\n    return to\n");
    await run.click();
    await expect(page.getByRole("heading", { name: "mutable-default-argument" })).toBeVisible({ timeout: 30_000 });
    expect(await seriousViolations(page)).toEqual([]);
  });
});
