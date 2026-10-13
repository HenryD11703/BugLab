import { describe, expect, it, vi } from "vitest";
import { runExercise } from "@/lib/runExercise";
import type { PythonRun, WorkerResult } from "@/lib/runner";
import type { Exercise } from "@/lib/types";

const exercise = {
  id: "x",
  title: "X",
  difficulty: "easy",
  tags: ["x"],
  concept: "x",
  description: "d",
  hints: ["a", "b"],
  explanation: "e",
  buggyCode: "",
  fix: {
    tests: [
      { description: "one", input: "f(1)", expected: "2" },
      { input: "f(2)", expected: "4" },
      { input: "f(3)", expected: "6" },
    ],
    constraints: { mustNotCall: ["sum"] },
  },
} as Exercise;

const workerResult = (over: Partial<WorkerResult> = {}): WorkerResult => ({
  stdout: "",
  load: null,
  tests: [
    { actual: "2", passed: true, error: null },
    { actual: "4", passed: true, error: null },
    { actual: "6", passed: true, error: null },
  ],
  ...over,
});

const returning = (r: Awaited<ReturnType<PythonRun>>): PythonRun => vi.fn(async () => r);

describe("runExercise", () => {
  it("reports a broken constraint without touching Python", async () => {
    const run = returning({ kind: "done", result: workerResult() });
    const res = await runExercise(exercise, "x = sum([1])\n", run);
    expect(run).not.toHaveBeenCalled();
    expect(res.status).toBe("failed");
    expect(res.requirementErrors).toEqual(["Must not call `sum()` (line 1)"]);
  });

  it("sends code with a syntax error to Python so it can explain it", async () => {
    const run = returning({
      kind: "done",
      result: workerResult({
        load: {
          phase: "code", kind: "SyntaxError", message: "invalid syntax", line: 1,
          traceback: 'File "solution.py", line 1\n    def f(:\nSyntaxError: invalid syntax',
        },
        tests: [],
      }),
    });
    const res = await runExercise(exercise, "def f(:\n", run);
    expect(run).toHaveBeenCalledOnce();
    expect(res.status).toBe("error");
    expect(res.error).toContain("SyntaxError");
    expect(res.errorLine).toBe(1);
  });

  it("maps a passing run", async () => {
    const res = await runExercise(exercise, "def f(x):\n    return x * 2\n", returning({ kind: "done", result: workerResult() }));
    expect(res.status).toBe("passed");
    expect(res.results.map((r) => r.passed)).toEqual([true, true, true]);
    expect(res.results[0]).toMatchObject({ description: "one", input: "f(1)", expectedOutput: "2", actualOutput: "2" });
  });

  it("maps a failing test and keeps its traceback", async () => {
    const res = await runExercise(
      exercise,
      "def f(x):\n    return x\n",
      returning({
        kind: "done",
        result: workerResult({
          tests: [
            { actual: "1", passed: false, error: null },
            { actual: "", passed: false, error: { kind: "ZeroDivisionError", message: "x", line: 2, traceback: "boom" } },
            { actual: "6", passed: true, error: null },
          ],
        }),
      })
    );
    expect(res.status).toBe("failed");
    expect(res.results.map((r) => r.passed)).toEqual([false, false, true]);
    expect(res.results[1].error).toBe("boom");
  });

  it("explains a timeout and flags it", async () => {
    const res = await runExercise(exercise, "while True:\n    pass\n", returning({ kind: "timeout" }));
    expect(res.status).toBe("error");
    expect(res.timedOut).toBe(true);
    expect(res.error).toMatch(/more than 5 seconds/);
  });

  it("explains an unavailable runtime and flags it", async () => {
    const res = await runExercise(exercise, "x = 1\n", returning({ kind: "unavailable", message: "offline" }));
    expect(res).toMatchObject({ status: "error", unavailable: true, error: "offline" });
  });

  it("does not hide a failing setup as a learner error", async () => {
    const res = await runExercise(
      exercise,
      "x = 1\n",
      returning({
        kind: "done",
        result: workerResult({
          load: { phase: "setup", kind: "NameError", message: "name 'q' is not defined", line: null, traceback: "tb" },
          tests: [],
        }),
      })
    );
    expect(res.error).toBe("The exercise setup failed: NameError: name 'q' is not defined");
    expect(res.errorLine).toBeUndefined();
  });

  it("refuses an exercise with no fix step", async () => {
    const res = await runExercise({ ...exercise, fix: undefined } as Exercise, "x", returning({ kind: "timeout" }));
    expect(res.status).toBe("error");
  });
});
