import { expect, type Page } from "@playwright/test";

/** Exercise 004 declares all four steps and a `None` rule; 014 has no rule at all. */
export const EX_004 = "/exercise/004-mutable-default";
export const EX_014 = "/exercise/014-operator-precedence";
export const FIXED_014 = "def average(a, b, c):\n    return (a + b + c) / 3\n";
export const FIXED_004 =
  "def append_to(element, to=None):\n    if to is None:\n        to = []\n    to.append(element)\n    return to\n";

type StepName = "Predict" | "Locate" | "Explain" | "Fix";

/** Opens a step tab. On phones it first switches to the Work tab. */
export async function openStep(page: Page, step: StepName) {
  const work = page.getByRole("tab", { name: "Work", exact: true });
  if (await work.isVisible()) await work.click();
  await page.getByRole("tab", { name: new RegExp(step) }).click();
}

/** Shows the instructions and hints. On phones that is the Read tab. */
export async function openRead(page: Page) {
  const read = page.getByRole("tab", { name: "Read", exact: true });
  if (await read.isVisible()) await read.click();
}

/** Waits for the Python runtime. Generous: many tests download it at once. */
export const waitForPython = (page: Page) =>
  expect(page.getByText("python ready")).toBeVisible({ timeout: 60_000 });

/** Opens the Fix step and waits until Python is ready. */
export async function openFix(page: Page) {
  await openStep(page, "Fix");
  await waitForPython(page);
}

/** Replaces the editor content and waits until the page has seen the edit. */
export async function setCode(page: Page, code: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
  await expect(editor).toContainText(code.split("\n")[0]);
}

export const run = (page: Page) =>
  page.getByRole("button", { name: /^(Run|Running|Loading Python)/ }).click();

/** Presses Tab until the focused element matches, so keyboard flows need no mouse. */
export async function tabTo(page: Page, matches: (el: Element) => boolean, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i++) {
    const hit = await page.evaluate(`(${matches.toString()})(document.activeElement)`);
    if (hit) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach the element with the keyboard in ${maxPresses} Tab presses`);
}

/** Does Predict, Locate and Explain of exercise 004 without a single mistake, and lands on Fix. */
export async function completeReadingSteps(page: Page) {
  await openStep(page, "Predict");
  await page.getByPlaceholder("type the output").fill("[1, 2]");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Continue to Locate/ }).click();
  await page.getByRole("button", { name: /^Line 1/ }).click();
  await page.getByRole("button", { name: /^Check line/ }).click();
  await page.getByRole("button", { name: /Continue to Explain/ }).click();
  await page.getByRole("radio").nth(1).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Continue to Fix/ }).click();
}

/** Types the right fix for exercise 004 and runs it. */
export async function solveFix(page: Page) {
  await waitForPython(page);
  await setCode(page, FIXED_004);
  await run(page);
  await expect(page.getByText("4 passed")).toBeVisible({ timeout: 30_000 });
}

/** The live score indicator in the top bar. */
export const ceiling = (page: Page, n: number) =>
  page.getByRole("status", { name: `You can still earn up to ${n} points` });
export const finalScore = (page: Page, total: number, grade: string) =>
  page.getByRole("status", { name: `Score ${total}, grade ${grade}` });
