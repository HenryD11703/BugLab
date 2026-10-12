import { expect, test, type Page } from "@playwright/test";

const EXERCISE = "/exercise/014-operator-precedence";
const FIXED = "def average(a, b, c):\n    return (a + b + c) / 3\n";

async function setCode(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
  await expect(editor).toContainText(code.split("\n")[0]);
}

test.describe("progress", () => {
  test("the code a learner wrote survives a reload, and Reset clears it", async ({ page }) => {
    await page.goto(EXERCISE);
    await setCode(page, "def average(a, b, c):\n    return 42  # my attempt\n");

    await page.reload();
    await expect(page.locator(".cm-content")).toContainText("my attempt");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator(".cm-content")).not.toContainText("my attempt");
    await page.reload();
    await expect(page.locator(".cm-content")).not.toContainText("my attempt");
  });

  test("a solved exercise shows as solved on the home page after a reload", async ({ page }) => {
    await page.goto(EXERCISE);
    await expect(page.getByText("python ready")).toBeVisible();
    await setCode(page, FIXED);
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByText("All tests passed")).toBeVisible();

    await page.goto("/");
    await expect(page.locator('a[href="/exercise/014-operator-precedence"]')).toContainText("solved");
    await page.reload();
    await expect(page.locator('a[href="/exercise/014-operator-precedence"]')).toContainText("solved");
    await expect(page.locator('a[href="/exercise/001-off-by-one"]')).not.toContainText("solved");
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
    await page.goto(EXERCISE);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await setCode(page, "def average(a, b, c):\n    return 0\n");
  });
});
