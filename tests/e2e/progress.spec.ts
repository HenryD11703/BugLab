import { expect, test } from "@playwright/test";
import { EX_014, FIXED_014, openFix, openRead, openStep, run, setCode } from "./helpers";

test.describe("progress", () => {
  test("the code a learner wrote survives a reload, and reset clears it", async ({ page }) => {
    await page.goto(EX_014);
    await openFix(page);
    await setCode(page, "def average(a, b, c):\n    return 42  # my attempt\n");

    await page.reload();
    await openStep(page, "Fix");
    await expect(page.locator(".cm-content")).toContainText("my attempt");

    await page.getByRole("button", { name: "reset", exact: true }).click();
    await expect(page.locator(".cm-content")).not.toContainText("my attempt");
    await page.reload();
    await openStep(page, "Fix");
    await expect(page.locator(".cm-content")).not.toContainText("my attempt");
  });

  test("a solved exercise shows as solved on the home page after a reload", async ({ page }) => {
    await page.goto(EX_014);
    await openFix(page);
    await setCode(page, FIXED_014);
    await run(page);
    await expect(page.getByText("4 passed")).toBeVisible({ timeout: 30_000 });

    await page.goto("/");
    const row = page.locator('a[href="/exercise/014-operator-precedence"]');
    await expect(row).toContainText("solved");
    // the name of the bug is revealed once it is solved, and only then
    await expect(row).toContainText("operator-precedence");
    await expect(page.locator('a[href="/exercise/001-off-by-one"]')).not.toContainText("off-by-one-range");
    await page.reload();
    await expect(row).toContainText("solved");
    await expect(page.getByText("1 of 20 solved")).toBeVisible();
  });

  test("completed steps and opened hints are remembered", async ({ page }) => {
    await page.goto("/exercise/004-mutable-default");
    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[1, 2]");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/^Right\./)).toBeVisible();

    await openRead(page);
    await page.getByRole("button", { name: /^hint 1/ }).click();
    await expect(page.getByText(/three times in a row/)).toBeVisible();

    await page.reload();
    await openRead(page);
    await expect(page.getByText(/three times in a row/)).toBeVisible();
    await openStep(page, "Predict");
    await expect(page.getByText(/^Right\./)).toBeVisible();
    await expect(page.getByRole("tab", { name: /Predict/ })).toContainText("✓");
  });

  test("solved exercises from the old storage format still show as solved", async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem("buglab:progress")) {
        localStorage.setItem("buglab:completed", JSON.stringify(["003-wrong-condition"]));
      }
    });
    await page.goto("/");
    await expect(page.locator('a[href="/exercise/003-wrong-condition"]')).toContainText("solved");
  });

  test("a page keeps working when storage is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked");
        },
      });
    });
    await page.goto(EX_014);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await openStep(page, "Fix");
    await setCode(page, "def average(a, b, c):\n    return 0\n");
  });

  test("an exercise in progress shows a plain status, not a stray rule or padding", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "buglab:progress",
        JSON.stringify({ version: 2, exercises: { "006-closure-trap": { hintsOpened: 1, done: { predict: true }, wrong: {}, failedRuns: 0 } } })
      );
    });
    await page.goto("/");
    const status = page.locator('a[href="/exercise/006-closure-trap"] .state');
    await expect(status).toHaveText("in progress");
    const style = await status.evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderBottomWidth, padding: s.paddingTop };
    });
    expect(style).toEqual({ border: "0px", padding: "0px" });
  });
});
