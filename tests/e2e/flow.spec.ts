import { expect, test } from "@playwright/test";
import { EX_004, FIXED_004, openRead, openStep, run, setCode, waitForPython } from "./helpers";

test.describe("an exercise from start to finish", () => {
  test("predict, locate, explain, fix", async ({ page }) => {
    await page.goto(EX_004);

    // Predict: a wrong answer, then the right one
    await openStep(page, "Predict");
    const answer = page.getByPlaceholder("type the output");
    await answer.fill("[2]");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/Not quite/)).toBeVisible();
    await answer.fill("[1,2]"); // spacing does not matter
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/^Right\./)).toBeVisible();
    await page.getByRole("button", { name: /Continue to Locate/ }).click();

    // Locate: a wrong line, then the right one
    await expect(page.getByRole("tab", { name: /Locate/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: /^Line 2/ }).click();
    await page.getByRole("button", { name: /^Check line/ }).click();
    await expect(page.getByText(/That is not the problem/)).toBeVisible();
    await page.getByRole("button", { name: /^Line 2/ }).click(); // unmark
    await page.getByRole("button", { name: /^Line 1/ }).click();
    await page.getByRole("button", { name: /^Check line/ }).click();
    await expect(page.getByText(/^Found it\./)).toBeVisible();
    await page.getByRole("button", { name: /Continue to Explain/ }).click();

    // Explain: a wrong option, then the right one
    await page.getByRole("radio").nth(0).click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/Not that one/)).toBeVisible();
    await page.getByRole("radio").nth(1).click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByText(/That is the reason/)).toBeVisible();
    await page.getByRole("button", { name: /Continue to Fix/ }).click();

    // Fix: the rule is enforced first, then the tests
    await waitForPython(page);
    await run(page);
    await expect(page.getByText("Rules of this exercise")).toBeVisible();
    await expect(page.getByText("Must use `None`")).toBeVisible();

    await setCode(page, FIXED_004);
    await run(page);
    await expect(page.getByText("4 passed")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "mutable-default-argument" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Next: 005 One Too Many/ })).toBeVisible();
    for (const s of ["Predict", "Locate", "Explain", "Fix"]) {
      await expect(page.getByRole("tab", { name: new RegExp(s) })).toContainText("✓");
    }
  });

  test("any step can be skipped or opened at any time", async ({ page }) => {
    await page.goto(EX_004);
    await openStep(page, "Predict");
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByRole("tab", { name: /Locate/ })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: /Fix/ }).click(); // jump straight to Fix
    await expect(page.getByRole("tab", { name: /Fix/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: /Explain/ }).click(); // and back
    await expect(page.getByRole("radio")).toHaveCount(3);
    // skipping marks nothing as done
    await expect(page.getByRole("tab", { name: /Predict/ })).not.toContainText("✓");
  });

  test("the solution stays locked until every hint is open, and is not in the page until then", async ({ page }) => {
    await page.goto(EX_004);
    await openRead(page);
    const locked = page.getByRole("button", { name: /opens after 3 more hints/ });
    await expect(locked).toBeDisabled();
    expect(await page.content()).not.toContain("if to is None:");

    await page.getByRole("button", { name: /^hint 1/ }).click();
    await expect(page.getByRole("button", { name: /opens after 2 more hints/ })).toBeDisabled();
    await page.getByRole("button", { name: /^hint 2/ }).click();
    await page.getByRole("button", { name: /^hint 3/ }).click();

    const show = page.getByRole("button", { name: "show solution" });
    await expect(show).toBeEnabled();
    await show.click();
    await expect(page.getByRole("group", { name: "Reference solution" })).toContainText("if to is None:");
  });

  test("hints open one at a time, in order", async ({ page }) => {
    await page.goto(EX_004);
    await openRead(page);
    await expect(page.getByRole("button", { name: /^hint 2/ })).toHaveCount(0); // not openable yet
    await page.getByRole("button", { name: /^hint 1/ }).click();
    await expect(page.getByRole("button", { name: /^hint 2/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^hint 3/ })).toHaveCount(0);
  });
});

test.describe("step tabs", () => {
  test("never show a scrollbar of their own on desktop widths", async ({ page, isMobile }) => {
    test.skip(isMobile, "phones use a grid, covered by the layout spec");
    for (const width of [1440, 1100, 920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(EX_004);
      const overflow = await page.locator(".tabs").evaluate((el) => ({
        x: el.scrollWidth - el.clientWidth,
        y: el.scrollHeight - el.clientHeight,
      }));
      expect(overflow, `tabs overflow at ${width}px`).toEqual({ x: 0, y: 0 });
    }
  });
});
