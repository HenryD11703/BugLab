import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_PROGRESS,
  LEGACY_KEY,
  STORAGE_KEY,
  applyAction,
  hintsForScore,
  isSolvedEver,
  isStarted,
  parseProgress,
  solvedIds,
} from "@/lib/progress-model";

describe("parseProgress", () => {
  it("returns empty progress for nothing, garbage or the wrong version", () => {
    expect(parseProgress(null)).toBe(EMPTY_PROGRESS);
    expect(parseProgress("not json")).toBe(EMPTY_PROGRESS);
    expect(parseProgress(JSON.stringify({ version: 1, exercises: {} }))).toBe(EMPTY_PROGRESS);
    expect(parseProgress(JSON.stringify([1, 2]))).toBe(EMPTY_PROGRESS);
  });

  it("round-trips valid data", () => {
    const data = {
      version: 2,
      exercises: {
        "001-a": {
          code: "x = 1", hintsOpened: 2, done: { locate: true, fix: true },
          wrong: { predict: 2 }, failedRuns: 3, solutionViewed: true, hintsAtSolve: 1, best: 87,
        },
      },
    };
    expect(parseProgress(JSON.stringify(data))).toEqual(data);
  });

  it("keeps the valid parts of damaged data", () => {
    const raw = JSON.stringify({
      version: 2,
      exercises: {
        good: { code: "ok", hintsOpened: 1, done: { fix: true, bogus: true } },
        bad: "not an object",
        weird: { code: 42, hintsOpened: -5, done: { predict: "yes" } },
      },
    });
    expect(parseProgress(raw).exercises).toEqual({
      good: { code: "ok", hintsOpened: 1, done: { fix: true }, wrong: {}, failedRuns: 0 },
      weird: { code: undefined, hintsOpened: 0, done: {}, wrong: {}, failedRuns: 0 },
    });
  });

  it("reads data saved before scoring existed, with zero mistakes", () => {
    const old = JSON.stringify({ version: 2, exercises: { a: { code: "x", hintsOpened: 1, done: { fix: true } } } });
    expect(parseProgress(old).exercises.a).toEqual({ code: "x", hintsOpened: 1, done: { fix: true }, wrong: {}, failedRuns: 0 });
  });

  it("rejects out-of-range or non-integer scores and counts", () => {
    const raw = JSON.stringify({
      version: 2,
      exercises: { a: { hintsOpened: 0, done: {}, best: 101, failedRuns: -4, wrong: { predict: 1.5, locate: 2 } }, b: { hintsOpened: 0, done: {}, best: "9" } },
    });
    const p = parseProgress(raw);
    expect(p.exercises.a).toEqual({ hintsOpened: 0, done: {}, wrong: { locate: 2 }, failedRuns: 0 });
    expect(p.exercises.b.best).toBeUndefined();
  });

  it("migrates the old list of solved ids", () => {
    const p = parseProgress(null, JSON.stringify(["001-a", "002-b", 7]));
    expect(solvedIds(p)).toEqual(["001-a", "002-b"]);
  });

  it("lets new data win over migrated data and survives a corrupt legacy value", () => {
    const raw = JSON.stringify({ version: 2, exercises: { "001-a": { hintsOpened: 3, done: {} } } });
    const p = parseProgress(raw, JSON.stringify(["001-a"]));
    expect(p.exercises["001-a"].done).toEqual({});
    expect(parseProgress(raw, "{{").exercises["001-a"].hintsOpened).toBe(3);
  });
});

describe("applyAction", () => {
  it("saves and clears code", () => {
    const a = applyAction(EMPTY_PROGRESS, { type: "saveCode", id: "x", code: "abc" });
    expect(a.exercises.x.code).toBe("abc");
    expect(applyAction(a, { type: "saveCode", id: "x", code: undefined }).exercises.x.code).toBeUndefined();
  });

  it("returns the same object when nothing changes (so React skips renders)", () => {
    const a = applyAction(EMPTY_PROGRESS, { type: "completeStep", id: "x", step: "fix" });
    expect(applyAction(a, { type: "completeStep", id: "x", step: "fix" })).toBe(a);
    expect(applyAction(a, { type: "saveCode", id: "y", code: undefined }).exercises.y?.code).toBeUndefined();
    const b = applyAction(a, { type: "setHintsOpened", id: "x", count: 2 });
    expect(applyAction(b, { type: "setHintsOpened", id: "x", count: 1 })).toBe(b);
  });

  it("never mutates the previous state", () => {
    const before = applyAction(EMPTY_PROGRESS, { type: "completeStep", id: "x", step: "locate" });
    const snapshot = JSON.stringify(before);
    applyAction(before, { type: "completeStep", id: "x", step: "fix" });
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(JSON.stringify(EMPTY_PROGRESS)).toBe('{"version":2,"exercises":{}}');
  });

  it("tracks each step independently and counts only Fix as solved", () => {
    let s = applyAction(EMPTY_PROGRESS, { type: "completeStep", id: "x", step: "predict" });
    s = applyAction(s, { type: "completeStep", id: "x", step: "explain" });
    expect(solvedIds(s)).toEqual([]);
    s = applyAction(s, { type: "completeStep", id: "x", step: "fix" });
    expect(solvedIds(s)).toEqual(["x"]);
  });
});

describe("browser store", () => {
  const memory = new Map<string, string>();
  const listeners: (() => void)[] = [];

  beforeEach(() => {
    memory.clear();
    vi.resetModules();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
    });
    vi.stubGlobal("window", {
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: () => {},
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("persists a draft and a solved step across a reload", async () => {
    const a = await import("@/lib/progress");
    a.saveCode("014", "def average(a, b, c):\n    return 1\n");
    a.completeStep("014", "fix");
    const saved = memory.get(STORAGE_KEY)!;
    expect(JSON.parse(saved).exercises["014"].done.fix).toBe(true);

    vi.resetModules(); // a new page load: empty module state, same storage
    const b = await import("@/lib/progress-model");
    const reloaded = b.parseProgress(memory.get(STORAGE_KEY) ?? null, memory.get(LEGACY_KEY) ?? null);
    expect(reloaded.exercises["014"].code).toContain("return 1");
    expect(b.solvedIds(reloaded)).toEqual(["014"]);
  });

  it("does not throw when storage is full or blocked", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    });
    const a = await import("@/lib/progress");
    expect(() => a.saveCode("x", "code")).not.toThrow();
    expect(() => a.completeStep("x", "fix")).not.toThrow();
  });
});

describe("score events", () => {
  const start = (over: object = {}) => ({ version: 2 as const, exercises: { x: { hintsOpened: 0, done: {}, wrong: {}, failedRuns: 0, ...over } } });

  it("counts wrong answers per step, one at a time", () => {
    let s = applyAction(start(), { type: "recordWrong", id: "x", step: "predict" });
    s = applyAction(s, { type: "recordWrong", id: "x", step: "predict" });
    s = applyAction(s, { type: "recordWrong", id: "x", step: "locate" });
    expect(s.exercises.x.wrong).toEqual({ predict: 2, locate: 1 });
  });

  it("ignores a wrong answer in a step that is already done", () => {
    const s = start({ done: { predict: true } });
    expect(applyAction(s, { type: "recordWrong", id: "x", step: "predict" })).toBe(s);
  });

  it("counts failed runs, but not after Fix is solved", () => {
    const s = applyAction(start(), { type: "recordFailedRun", id: "x" });
    expect(s.exercises.x.failedRuns).toBe(1);
    const solved = start({ done: { fix: true } });
    expect(applyAction(solved, { type: "recordFailedRun", id: "x" })).toBe(solved);
  });

  it("only counts the solution as viewed before Fix is solved", () => {
    expect(applyAction(start(), { type: "solutionShown", id: "x" }).exercises.x.solutionViewed).toBe(true);
    const solved = start({ done: { fix: true } });
    expect(applyAction(solved, { type: "solutionShown", id: "x" })).toBe(solved);
  });

  it("freezes the hint count when Fix is solved, so later hints do not change the score", () => {
    let s = applyAction(start({ hintsOpened: 2 }), { type: "completeStep", id: "x", step: "fix" });
    expect(s.exercises.x.hintsAtSolve).toBe(2);
    s = applyAction(s, { type: "setHintsOpened", id: "x", count: 3 });
    expect(s.exercises.x.hintsOpened).toBe(3);
    expect(hintsForScore(s.exercises.x)).toBe(2);
    expect(hintsForScore(start({ hintsOpened: 1 }).exercises.x)).toBe(1);
  });

  it("keeps only the best score", () => {
    let s = applyAction(start(), { type: "recordBest", id: "x", score: 80 });
    const same = applyAction(s, { type: "recordBest", id: "x", score: 70 });
    expect(same).toBe(s);
    s = applyAction(s, { type: "recordBest", id: "x", score: 95.4 });
    expect(s.exercises.x.best).toBe(95);
  });

  it("repeat clears the attempt and keeps the best score", () => {
    const before = start({ code: "x", hintsOpened: 2, done: { predict: true, fix: true }, wrong: { predict: 1 }, failedRuns: 2, solutionViewed: true, hintsAtSolve: 2, best: 77 });
    const after = applyAction(before, { type: "repeat", id: "x", wasSolved: true });
    expect(after.exercises.x).toEqual({ hintsOpened: 0, done: {}, wrong: {}, failedRuns: 0, best: 77 });
    expect(isSolvedEver(after.exercises.x, ["predict", "fix"])).toBe(true);
    expect(isStarted(after.exercises.x)).toBe(false);
  });

  it("repeating a solved exercise without a saved score keeps it solved (old data)", () => {
    const before = start({ done: { fix: true } });
    const after = applyAction(before, { type: "repeat", id: "x", wasSolved: true });
    expect(after.exercises.x.best).toBe(0);
    expect(isSolvedEver(after.exercises.x, ["fix"])).toBe(true);
  });

  it("repeating something never solved leaves no trace of a score", () => {
    const after = applyAction(start({ code: "x", failedRuns: 3 }), { type: "repeat", id: "x", wasSolved: false });
    expect(after.exercises.x.best).toBeUndefined();
    expect(isSolvedEver(after.exercises.x, ["fix"])).toBe(false);
  });

  it("repeat on an exercise with no progress changes nothing", () => {
    expect(applyAction(EMPTY_PROGRESS, { type: "repeat", id: "nope", wasSolved: false })).toBe(EMPTY_PROGRESS);
  });
});
