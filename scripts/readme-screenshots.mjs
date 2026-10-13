// Regenerates the pictures in docs/screenshots (used by README.md) from the real app.
//
//   npm run build && npx next start -p 3100     # in one terminal
//   npm run screenshots                          # in another
//
// It plays one exercise (004) the way a learner would, so every picture is a
// state the app really produces. Needs network access: it downloads Pyodide.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.join(process.cwd(), "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const EX = `${BASE}/exercise/004-mutable-default`;
const FAILING_FIX = "def append_to(element, to=None):\n    if to is None:\n        to = [0]\n    to.append(element)\n    return to\n";
const FIXED = "def append_to(element, to=None):\n    if to is None:\n        to = []\n    to.append(element)\n    return to\n";

const all = { predict: true, locate: true, explain: true, fix: true };
const solved = (best, extra = {}) => ({ hintsOpened: 0, done: all, wrong: {}, failedRuns: 0, best, ...extra });
// A believable home page: a few solved with different grades, one in progress.
const HOME_PROGRESS = {
  version: 2,
  exercises: {
    "001-off-by-one": solved(100),
    "002-silent-return": solved(92),
    "003-wrong-condition": solved(78),
    "004-mutable-default": solved(61),
    "005-one-too-many": solved(100),
    "006-closure-trap": { hintsOpened: 1, done: { predict: true }, wrong: { locate: 1 }, failedRuns: 0 },
    "009-identity-crisis": solved(45),
  },
};

async function setCode(page, code) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(code);
  await page.waitForTimeout(150);
}

const shot = (page, name, clip) => page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });

const browser = await chromium.launch();

// ---------- desktop: the exercise, step by step ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(EX);
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /^hint 1/ }).click();
  await page.getByPlaceholder("type the output").fill("[2]");
  await page.getByRole("button", { name: "Check" }).click();
  await shot(page, "predict.png", { x: 0, y: 0, width: 1440, height: 800 });

  await page.getByPlaceholder("type the output").fill("[1, 2]");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Continue to Locate/ }).click();
  await page.getByRole("button", { name: /^Line 2/ }).click();
  await page.getByRole("button", { name: /^Check line/ }).click();
  await page.getByRole("button", { name: /^Line 2/ }).click();
  await page.getByRole("button", { name: /^Line 1/ }).click();
  await page.getByRole("button", { name: /^Check line/ }).click();
  await page.getByText(/^Found it\./).waitFor();
  await shot(page, "locate.png", { x: 0, y: 0, width: 1440, height: 640 });

  await page.getByRole("button", { name: /Continue to Explain/ }).click();
  await page.getByRole("radio").nth(0).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("radio").nth(1).click();
  await shot(page, "explain.png", { x: 0, y: 0, width: 1440, height: 700 });
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Continue to Fix/ }).click();

  await page.getByText("python ready").waitFor({ timeout: 60000 });
  await setCode(page, FAILING_FIX);
  await page.getByRole("button", { name: /^Run/ }).click();
  await page.getByText(/failed/).first().waitFor({ timeout: 30000 });
  await shot(page, "fix.png", { x: 0, y: 0, width: 1440, height: 900 });

  await setCode(page, FIXED);
  await page.getByRole("button", { name: /^Run/ }).click();
  await page.getByRole("region", { name: "Score" }).waitFor({ timeout: 30000 });
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.waitForTimeout(400);
  const work = await page.locator(".work").boundingBox();
  const score = await page.getByRole("region", { name: "Score" }).boundingBox();
  await shot(page, "solved.png", { x: work.x, y: score.y - 40, width: work.width + 20, height: Math.min(1500 - (score.y - 40), score.height + 130) });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole("button", { name: "↺ repeat", exact: true }).click();
  await page.waitForTimeout(150);
  await shot(page, "repeat.png", { x: 0, y: 0, width: 1440, height: 53 });
  await ctx.close();
}

// ---------- desktop: the home page ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1180 }, reducedMotion: "reduce" });
  await ctx.addInitScript((progress) => localStorage.setItem("buglab:progress", JSON.stringify(progress)), HOME_PROGRESS);
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  await shot(page, "home.png");
  await ctx.close();
}

// ---------- phone ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(EX);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^hint 1/ }).click();
  await shot(page, "phone-read.png");

  await page.getByRole("tab", { name: "Work", exact: true }).click();
  await page.getByRole("tab", { name: /Fix/ }).click();
  await page.getByText("python ready").waitFor({ timeout: 60000 });
  await setCode(page, FAILING_FIX);
  await page.getByRole("button", { name: /^Run/ }).click();
  await page.getByText(/failed/).first().waitFor({ timeout: 30000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "phone-work.png");
  await ctx.close();
}

await browser.close();
console.log("wrote", fs.readdirSync(OUT).join(", "));
