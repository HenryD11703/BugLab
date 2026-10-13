import { expect, test } from "@playwright/test";
import {
  EX_004, FIXED_004, ceiling, completeReadingSteps, finalScore, openFix, openRead, openStep, run, setCode, solveFix, waitForPython,
} from "./helpers";

const receipt = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Score" });
const total = (page: import("@playwright/test").Page) => page.locator(".receipt-total .num");

test.describe("score", () => {
  test("a clean run is worth 100 and an S, in the receipt, the header and the home page", async ({ page }) => {
    await page.goto(EX_004);
    await expect(ceiling(page, 100)).toBeVisible();
    await completeReadingSteps(page);
    await solveFix(page);

    await expect(total(page)).toHaveText("100");
    await expect(page.locator(".receipt-total .grade")).toContainText("S");
    for (const [step, pts] of [["predict", 20], ["locate", 20], ["explain", 20], ["fix", 40]] as const) {
      await expect(receipt(page).locator("li", { hasText: step })).toContainText(`+${pts}`);
    }
    await expect(page.getByText("new best")).toBeVisible();
    await expect(finalScore(page, 100, "S")).toBeVisible();

    await page.goto("/");
    const row = page.locator('a[href="/exercise/004-mutable-default"]');
    await expect(row).toContainText("100");
    await expect(row.locator(".rowscore")).toContainText("S");
    await expect(page.getByText(/1 of 20 solved/)).toContainText("100 pts");
  });

  test("every mistake costs points, and the live indicator shows it at once", async ({ page }) => {
    await page.goto(EX_004);
    await expect(ceiling(page, 100)).toBeVisible();

    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[2]");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(ceiling(page, 95)).toBeVisible();

    await openRead(page);
    await page.getByRole("button", { name: /^hint 1/ }).click();
    await expect(ceiling(page, 90)).toBeVisible();

    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[1, 2]");
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: /Continue to Locate/ }).click();
    await page.getByRole("button", { name: /^Line 2/ }).click(); // the wrong line
    await page.getByRole("button", { name: /^Check line/ }).click();
    await expect(ceiling(page, 85)).toBeVisible();
    await page.getByRole("button", { name: /^Line 2/ }).click();
    await page.getByRole("button", { name: /^Line 1/ }).click();
    await page.getByRole("button", { name: /^Check line/ }).click();
    await page.getByRole("button", { name: /Continue to Explain/ }).click();
    await page.getByRole("radio").nth(1).click();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: /Continue to Fix/ }).click();

    await waitForPython(page);
    await run(page); // the original code breaks the rule: a run that does not pass
    await expect(page.getByText("Rules of this exercise")).toBeVisible();
    await expect(ceiling(page, 82)).toBeVisible();

    await setCode(page, FIXED_004);
    await run(page);
    await expect(total(page)).toHaveText("82", { timeout: 30_000 });
    await expect(page.locator(".receipt-total .grade")).toContainText("A");
    await expect(receipt(page).locator("li", { hasText: "predict" })).toContainText("1 wrong answer, -5");
    await expect(receipt(page).locator("li", { hasText: "locate" })).toContainText("1 wrong answer, -5");
    await expect(receipt(page).locator("li", { hasText: "fix" })).toContainText("1 failed run, -3");
    await expect(receipt(page).locator("li", { hasText: "hints" })).toContainText("1 hint opened");
    await expect(finalScore(page, 82, "A")).toBeVisible();
  });

  test("skipped steps are worth 0, and the solution opened before solving makes Fix worth 0", async ({ page }) => {
    await page.goto(EX_004);
    await openRead(page);
    for (const n of [1, 2, 3]) await page.getByRole("button", { name: new RegExp(`^hint ${n}`) }).click();
    await expect(page.getByText(/makes Fix worth 0 points/)).toBeVisible();
    await expect(ceiling(page, 85)).toBeVisible();

    await page.getByRole("button", { name: "show solution" }).click();
    await expect(page.getByRole("group", { name: "Reference solution" })).toBeVisible();
    await expect(ceiling(page, 45)).toBeVisible(); // 20 + 20 + 20 + 0, minus 15 for the hints

    await openFix(page);
    await solveFix(page);
    await expect(receipt(page).locator("li", { hasText: "predict" })).toContainText("skipped");
    await expect(receipt(page).locator("li", { hasText: "fix" })).toContainText("opened the solution first");
    await expect(total(page)).toHaveText("0");
    await expect(page.locator(".receipt-total .grade")).toContainText("C");

    // a score of 0 is still a solved exercise, shown without a number
    await page.goto("/");
    const row = page.locator('a[href="/exercise/004-mutable-default"]');
    await expect(row).toContainText("solved");
    await expect(row.locator(".rowscore")).toHaveCount(0);
  });

  test("hints and the solution opened after solving cost nothing", async ({ page }) => {
    await page.goto(EX_004);
    await completeReadingSteps(page);
    await solveFix(page);
    await expect(total(page)).toHaveText("100");

    await openRead(page);
    await page.getByRole("button", { name: /^hint 1/ }).click();
    await page.getByRole("button", { name: /^hint 2/ }).click();
    await page.getByRole("button", { name: "show solution" }).click();
    await expect(page.getByRole("group", { name: "Reference solution" })).toBeVisible();
    await expect(finalScore(page, 100, "S")).toBeVisible();

    await page.reload();
    await expect(finalScore(page, 100, "S")).toBeVisible();
  });

  test("mistakes survive a reload", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[2]");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(ceiling(page, 95)).toBeVisible();
    await page.reload();
    await expect(ceiling(page, 95)).toBeVisible();
  });

  test("a run that could not happen (no Python runtime) is not a mistake", async ({ page }) => {
    await page.route("**://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.goto(EX_004);
    await openStep(page, "Fix");
    await expect(page.getByText("python unavailable")).toBeVisible({ timeout: 30_000 });
    await setCode(page, FIXED_004);
    await run(page);
    await expect(page.getByText(/Could not download the Python runtime/)).toBeVisible();
    await expect(ceiling(page, 100)).toBeVisible();
  });

  test("the header shows the final score and grade, in the colour of the grade", async ({ page }) => {
    await page.goto(EX_004);
    await completeReadingSteps(page);
    await solveFix(page);
    await expect(finalScore(page, 100, "S").locator(".grade")).toHaveClass(/g-S/);
  });
});

test.describe("repeat", () => {
  test("there is nothing to repeat before the learner does anything", async ({ page }) => {
    await page.goto(EX_004);
    await expect(page.getByRole("button", { name: "↺ repeat", exact: true })).toHaveCount(0);
  });

  test("repeat asks first, and cancel changes nothing", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[2]");
    await page.getByRole("button", { name: "Check" }).click();

    await page.getByRole("button", { name: "↺ repeat", exact: true }).click();
    await expect(page.getByText(/Start over\?/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(/Start over\?/)).toHaveCount(0);
    await expect(ceiling(page, 95)).toBeVisible();
  });

  test("repeat starts the exercise over and keeps the best score", async ({ page }) => {
    await page.goto(EX_004);

    // attempt 1: one wrong answer, one hint opened, a draft in the editor, then solved: 100 - 5 - 5 = 90
    await openRead(page);
    await page.getByRole("button", { name: /^hint 1/ }).click();
    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[2]");
    await page.getByRole("button", { name: "Check" }).click();
    await completeReadingSteps(page);
    await solveFix(page);
    await expect(total(page)).toHaveText("90");

    // repeat from the solved panel
    await page.getByRole("button", { name: /^Repeat/ }).click();
    await expect(page.getByText(/Start over\? Your best \(90\) is kept\./)).toBeVisible();
    await page.getByRole("button", { name: "Yes, repeat" }).click();

    // a clean slate: first step, no ticks, no hints, no solved panel, original code, full score
    await expect(page.getByRole("tab", { name: /Predict/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByPlaceholder("type the output")).toHaveValue("");
    for (const s of ["Predict", "Locate", "Explain", "Fix"]) {
      await expect(page.getByRole("tab", { name: new RegExp(s) })).not.toContainText("✓");
    }
    await expect(ceiling(page, 100)).toBeVisible();
    await openRead(page);
    await expect(page.getByRole("button", { name: /^hint 1/ })).toBeVisible(); // closed again
    await expect(page.getByRole("button", { name: /opens after 3 more hints/ })).toBeDisabled();
    await openStep(page, "Fix");
    await expect(page.locator(".cm-content")).not.toContainText("if to is None");
    await expect(page.getByText("The bug you found")).toHaveCount(0);

    // the home page still counts it as solved, with the best score
    await page.goto("/");
    const row = page.locator('a[href="/exercise/004-mutable-default"]');
    await expect(row).toContainText("solved");
    await expect(row.locator(".rowscore")).toContainText("90");
    await expect(row).toContainText("mutable-default-argument");

    // attempt 2: a clean run raises it to 100
    await page.goto(EX_004);
    await completeReadingSteps(page);
    await solveFix(page);
    await expect(total(page)).toHaveText("100");
    await expect(page.getByText("new best")).toBeVisible();
    await page.goto("/");
    await expect(page.locator('a[href="/exercise/004-mutable-default"] .rowscore')).toContainText("100");
  });

  test("a worse attempt never lowers the best score", async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem("buglab:progress")) {
        localStorage.setItem(
          "buglab:progress",
          JSON.stringify({ version: 2, exercises: { "004-mutable-default": { hintsOpened: 0, done: {}, wrong: {}, failedRuns: 0, best: 95 } } })
        );
      }
    });
    await page.goto(EX_004);
    // solving with the solution open: far worse than 95
    await openRead(page);
    for (const n of [1, 2, 3]) await page.getByRole("button", { name: new RegExp(`^hint ${n}`) }).click();
    await page.getByRole("button", { name: "show solution" }).click();
    await openFix(page);
    await solveFix(page);
    await expect(total(page)).toHaveText("0");
    await expect(page.getByText("best 95")).toBeVisible();

    await page.goto("/");
    await expect(page.locator('a[href="/exercise/004-mutable-default"] .rowscore')).toContainText("95");
  });

  test("repeat works the same on the top bar while an attempt is in progress", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Predict");
    await page.getByPlaceholder("type the output").fill("[1, 2]");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("tab", { name: /Predict/ })).toContainText("✓");

    await page.getByRole("button", { name: "↺ repeat", exact: true }).click();
    await page.getByRole("button", { name: "Yes, repeat" }).click();
    await expect(page.getByRole("tab", { name: /Predict/ })).not.toContainText("✓");
    await expect(page.getByPlaceholder("type the output")).toBeVisible();
    // nothing was solved, so nothing is left behind on the home page
    await page.goto("/");
    await expect(page.getByText(/0 of 20 solved/)).toBeVisible();
  });

  test("after solving, repeat is in the top bar on every step, not only on the solved panel", async ({ page }) => {
    await page.goto(EX_004);
    await completeReadingSteps(page);
    await solveFix(page);
    await expect(total(page)).toHaveText("100");

    // go back to a reading step: the solved panel is out of sight, the top bar is not
    await openStep(page, "Predict");
    const repeatInBar = page.getByRole("button", { name: "↺ repeat", exact: true });
    await expect(repeatInBar).toBeVisible();
    await repeatInBar.click();
    await expect(page.getByText(/Start over\? Your best \(100\) is kept\./)).toBeVisible();
    await page.getByRole("button", { name: "Yes, repeat" }).click();
    await expect(ceiling(page, 100)).toBeVisible();
    await expect(page.getByRole("tab", { name: /Fix/ })).not.toContainText("✓");
    // a fresh attempt with nothing done: nothing to repeat until the learner does something
    await expect(repeatInBar).toHaveCount(0);
  });
});
