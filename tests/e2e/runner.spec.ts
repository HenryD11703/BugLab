import { expect, test } from "@playwright/test";
import { EX_014, FIXED_014, openFix, run, setCode } from "./helpers";

// Exercise 014 has no rules, so every run reaches Python.
test.describe("Python runner", () => {
  test("stops an infinite loop within the time limit and the page stays usable", async ({ page }) => {
    await page.goto(EX_014);
    await openFix(page);

    await setCode(page, "def average(a, b, c):\n    while True:\n        pass\n");
    await run(page);
    await expect(page.getByText(/ran for more than 5 seconds/)).toBeVisible({ timeout: 20_000 });

    // the page is alive: it can edit, and the next run works once Python reloads
    await setCode(page, FIXED_014);
    await run(page);
    await expect(page.getByText("4 passed")).toBeVisible({ timeout: 60_000 });
  });

  test("a function from an earlier run cannot satisfy a later one", async ({ page }) => {
    await page.goto(EX_014);
    await openFix(page);

    await setCode(page, FIXED_014);
    await run(page);
    await expect(page.getByText("4 passed")).toBeVisible({ timeout: 30_000 });

    await setCode(page, "x = 1\n");
    await run(page);
    await expect(page.getByText("4 failed, 0 passed")).toBeVisible();
    await expect(page.getByText(/NameError/).first()).toBeVisible();
  });

  test("shows a Python-style traceback for a runtime error", async ({ page }) => {
    await page.goto(EX_014);
    await openFix(page);
    await setCode(page, "def average(a, b, c):\n    return 1 / 0\n");
    await run(page);
    await expect(page.getByText(/ZeroDivisionError/).first()).toBeVisible();
    await expect(page.getByText(/solution\.py/).first()).toBeVisible();
  });

  test("explains a syntax error with the line it is on", async ({ page }) => {
    await page.goto(EX_014);
    await openFix(page);
    await setCode(page, "def average(a, b, c:\n    return 0\n");
    await run(page);
    await expect(page.getByText(/SyntaxError/).first()).toBeVisible();
  });

  test("keeps working with a clear message when the runtime cannot be downloaded", async ({ page }) => {
    await page.route("**://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.goto("/exercise/001-off-by-one");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Off By One");

    const work = page.getByRole("tab", { name: "Work", exact: true });
    if (await work.isVisible()) await work.click();
    await page.getByRole("tab", { name: /Fix/ }).click();
    await expect(page.getByText("python unavailable")).toBeVisible({ timeout: 30_000 });

    // the reading steps still work without the runtime
    await page.getByRole("tab", { name: /Predict/ }).click();
    await page.getByPlaceholder("type the output").fill("3");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/^Right\./)).toBeVisible();

    await page.getByRole("tab", { name: /Fix/ }).click();
    await setCode(page, "def sum_list(numbers):\n    total = 0\n    for n in numbers:\n        total += n\n    return total\n");
    await run(page);
    await expect(page.getByText(/Could not download the Python runtime/)).toBeVisible();
  });

  test("loads the home page and the reading steps without downloading the Python runtime", async ({ page }) => {
    const cdn: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("jsdelivr.net")) cdn.push(r.url());
    });
    await page.goto("/");
    await expect(page.locator('a[href^="/exercise/"]').first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(cdn).toEqual([]);

    await page.goto("/exercise/001-off-by-one");
    await page.waitForLoadState("networkidle");
    expect(cdn).toEqual([]);
  });
});
