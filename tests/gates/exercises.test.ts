import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { checkExercise, pythonVersion } from "./gates";

const EXERCISES = path.join(process.cwd(), "exercises");
const ids = fs
  .readdirSync(EXERCISES)
  .filter((f) => fs.statSync(path.join(EXERCISES, f)).isDirectory())
  .sort();

beforeAll(() => {
  const v = pythonVersion();
  // Pyodide 0.27.x ships CPython 3.12; behaviour must be checked on that line.
  if (!v.startsWith("3.12.")) {
    if (process.env.CI) throw new Error(`gates must run on Python 3.12 in CI, found ${v}`);
    console.warn(`[gates] Python ${v}: the browser runs 3.12, CI checks that version.`);
  }
});

describe("exercise gates (real CPython)", () => {
  it("finds the exercises", () => {
    expect(ids.length).toBeGreaterThanOrEqual(20);
  });

  it.each(ids)("%s passes every gate", (id) => {
    expect(checkExercise(path.join(EXERCISES, id))).toEqual([]);
  });
});

describe("the gates catch broken exercises", () => {
  function scratchExercise(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buglab-gate-"));
    for (const [name, content] of Object.entries(files)) {
      const p = path.join(dir, name);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
    }
    return dir;
  }

  const meta = {
    title: "Scratch",
    difficulty: "easy",
    tags: ["x"],
    concept: "scratch",
    description: "d",
    hints: ["a", "b"],
    explanation: "e",
  };
  const tests = [
    { input: "f(1)", expected: "2" },
    { input: "f(2)", expected: "4" },
    { input: "f(3)", expected: "6" },
  ];
  const good = {
    "buggy.py": "def f(x):\n    return x + x + 1\n",
    "solution.py": "def f(x):\n    return x * 2\n",
    "wrong-fixes/still-wrong.py": "def f(x):\n    return x + 1\n",
  };
  const build = (over: Record<string, string>, ex: object = {}) =>
    scratchExercise({
      "exercise.json": JSON.stringify({ ...meta, fix: { tests }, ...ex }),
      ...good,
      ...over,
    });

  it("accepts a sound exercise", () => {
    expect(checkExercise(build({}))).toEqual([]);
  });

  it("rejects buggy code that already passes", () => {
    const problems = checkExercise(build({ "buggy.py": good["solution.py"] }));
    expect(problems.join("\n")).toMatch(/buggy\.py passes every test/);
  });

  it("rejects a solution that fails", () => {
    const problems = checkExercise(build({ "solution.py": good["buggy.py"] }));
    expect(problems.join("\n")).toMatch(/solution\.py fails/);
  });

  it("rejects a wrong fix that the tests cannot tell apart from the solution", () => {
    const problems = checkExercise(
      build({ "wrong-fixes/same.py": good["solution.py"] })
    );
    expect(problems.join("\n")).toMatch(/passes every test, so tests miss/);
  });

  it("rejects a predict answer that CPython does not produce", () => {
    const problems = checkExercise(
      build({}, { predict: { code: "f(5)", answer: "99" } })
    );
    expect(problems.join("\n")).toMatch(/predict: answer "99" but CPython gives "11"/);
  });

  it("rejects a locate line that is blank", () => {
    const problems = checkExercise(
      build(
        { "buggy.py": "def f(x):\n\n    return x + x + 1\n" },
        { locate: { bugs: [{ lines: [2] }] } }
      )
    );
    expect(problems.join("\n")).toMatch(/line 2 is blank/);
  });

  it("requires at least one wrong fix", () => {
    const dir = build({});
    fs.rmSync(path.join(dir, "wrong-fixes"), { recursive: true });
    expect(checkExercise(dir).join("\n")).toMatch(/needs at least one plausible wrong fix/);
  });
});
