import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const EXERCISES = path.join(process.cwd(), "exercises");
const all = fs
  .readdirSync(EXERCISES)
  .filter((f) => fs.statSync(path.join(EXERCISES, f)).isDirectory())
  .map((id) => ({ id, ...JSON.parse(fs.readFileSync(path.join(EXERCISES, id, "exercise.json"), "utf-8")) }));

const rows = (page: import("@playwright/test").Page) => page.locator('a[href^="/exercise/"]');

test.describe("home", () => {
  test("lists every exercise and says nothing about the bugs", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the bug");
    await expect(rows(page)).toHaveCount(all.length);
    await expect(page.getByText("not found yet")).toHaveCount(all.length);
    if (!isMobile) {
      // on phones the column is dropped on purpose; on desktop it once vanished under Tailwind's "hidden" class
      await expect(page.getByText("not found yet").first()).toBeVisible();
      await expect(page.getByText("not found yet").last()).toBeVisible();
    }
    // a concept that is also a visible topic (019: "truthiness") is not a secret
    for (const e of all.filter((e) => !e.tags.includes(e.concept))) {
      await expect(page.locator("body")).not.toContainText(e.concept);
    }
    await expect(page.getByText("0 of 20 solved")).toBeVisible();
  });

  test("filters by difficulty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "easy", exact: true }).click();
    await expect(rows(page)).toHaveCount(all.filter((e) => e.difficulty === "easy").length);
    await page.getByRole("button", { name: "hard", exact: true }).click();
    await expect(rows(page)).toHaveCount(all.filter((e) => e.difficulty === "hard").length);
    await page.getByRole("button", { name: "all", exact: true }).click();
    await expect(rows(page)).toHaveCount(all.length);
  });

  test("searches by title or topic, but never by a hidden bug name", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: "Search exercises" });
    await search.fill("closure");
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Closure Trap");

    await search.fill("mutable"); // the bug in 004 (and part of the slug of 004 and 015), not solved
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText(/No exercise matches/)).toBeVisible();

    await search.fill("");
    await expect(rows(page)).toHaveCount(all.length);
  });

  test("opens an exercise from the list", async ({ page }) => {
    await page.goto("/");
    await rows(page).first().click();
    await expect(page).toHaveURL(/\/exercise\/001-off-by-one$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Off By One");
  });

  test("an unknown exercise is a clean 404", async ({ page }) => {
    const res = await page.goto("/exercise/999-nope");
    expect(res?.status()).toBe(404);
  });
});
