import { describe, expect, it } from "vitest";
import { exerciseSchema } from "@/lib/schema";
import { getAllExercises } from "@/lib/exercises";

const base = {
  title: "T",
  difficulty: "easy",
  tags: ["x"],
  concept: "some-concept",
  description: "d",
  hints: ["a", "b"],
  explanation: "e",
  fix: {
    tests: [
      { input: "f(1)", expected: "1" },
      { input: "f(2)", expected: "2" },
      { input: "f(3)", expected: "3" },
    ],
  },
};

const issues = (over: object) => {
  const r = exerciseSchema.safeParse({ ...base, ...over });
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("exercise schema", () => {
  it("accepts a minimal valid exercise", () => {
    expect(issues({})).toEqual([]);
  });

  it("rejects unknown fields (typos must not pass silently)", () => {
    expect(issues({ hint: ["typo"] }).join()).toMatch(/hint/);
  });

  it("rejects an exercise with no steps", () => {
    expect(issues({ fix: undefined }).join()).toMatch(/at least one of predict/);
  });

  it("rejects fewer than 3 tests", () => {
    expect(issues({ fix: { tests: base.fix.tests.slice(0, 2) } }).join()).toMatch(/fix\.tests/);
  });

  it("rejects an explain step whose answer is not an option", () => {
    const explain = { question: "q", options: ["a", "b", "c"], correct: 3 };
    expect(issues({ explain }).join()).toMatch(/valid index/);
  });

  it("rejects a locate group with line 0", () => {
    expect(issues({ locate: { bugs: [{ lines: [0] }] } }).join()).toMatch(/locate/);
  });

  it("rejects a constraint keyword that is not a Python keyword", () => {
    const fix = { ...base.fix, constraints: { mustUseKeyword: ["sorted"] } };
    expect(issues({ fix }).join()).toMatch(/mustUseKeyword/);
  });

  it("rejects a non kebab-case concept", () => {
    expect(issues({ concept: "Not Kebab" }).join()).toMatch(/concept/);
  });
});

describe("exercise loader", () => {
  it("loads and validates every exercise on disk", () => {
    const all = getAllExercises();
    expect(all).toHaveLength(20);
    expect(all.every((e) => e.buggyCode.length > 0)).toBe(true);
  });

  it("keeps solutions and wrong fixes out of the loaded data", () => {
    const json = JSON.stringify(getAllExercises());
    expect(json).not.toContain("wrong-fixes");
    expect(json).not.toContain("return x * 2");
  });
});
