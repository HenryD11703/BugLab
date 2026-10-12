import { expect, test } from "@playwright/test";
import { run, setCode, waitForPython } from "./helpers";

// Exercise 014 has no constraints, so every run reaches Python.
const EXERCISE = "/exercise/014-operator-precedence";
const FIXED = "def average(a, b, c):\n    return (a + b + c) / 3\n";

test.describe("Python runner", () => {
  test("stops an infinite loop within the time limit and the page stays usable", async ({ page }) => {
    await page.goto(EXERCISE);
    await waitForPython(page);

    await setCode(page, "def average(a, b, c):\n    while True:\n        pass\n");
    await run(page);
    await expect(page.getByText(/ran for more than 5 seconds/)).toBeVisible({ timeout: 20_000 });

    // the page is alive: it can edit, and the next run works once Python reloads
    await setCode(page, FIXED);
    await run(page);
    await expect(page.getByText("All tests passed")).toBeVisible({ timeout: 60_000 });
  });

  test("a function from an earlier run cannot satisfy a later one", async ({ page }) => {
    await page.goto(EXERCISE);
    await waitForPython(page);

    await setCode(page, FIXED);
    await run(page);
    await expect(page.getByText("All tests passed")).toBeVisible({ timeout: 30_000 });

    await setCode(page, "x = 1\n");
    await run(page);
    await expect(page.getByText("Tests failed")).toBeVisible();
    await expect(page.getByText("All tests passed")).toHaveCount(0);
    await expect(page.getByText(/NameError/).first()).toBeVisible();
  });

  test("shows a Python-style traceback for a runtime error", async ({ page }) => {
    await page.goto(EXERCISE);
    await waitForPython(page);
    await setCode(page, "def average(a, b, c):\n    return 1 / 0\n");
    await run(page);
    await expect(page.getByText(/ZeroDivisionError/).first()).toBeVisible();
    await expect(page.getByText(/solution\.py/).first()).toBeVisible();
  });

  test("keeps working with a clear message when the runtime cannot be downloaded", async ({ page }) => {
    await page.route("**://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.goto("/exercise/001-off-by-one");
    await expect(page.getByText("python unavailable")).toBeVisible({ timeout: 30_000 });

    await run(page);
    await expect(page.getByText(/Could not download the Python runtime/)).toBeVisible();
    // the page itself is intact
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Off By One");
  });

  test("loads the home page without downloading the Python runtime", async ({ page }) => {
    const cdn: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("jsdelivr.net")) cdn.push(r.url());
    });
    await page.goto("/");
    await expect(page.locator('a[href^="/exercise/"]').first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(cdn).toEqual([]);
  });
});
