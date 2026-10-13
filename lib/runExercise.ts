import { checkConstraints } from "./analysis";
import { RUN_TIMEOUT_MS, runPython, type PythonRun, type PythonError } from "./runner";
import type { Exercise, RunResult, TestResult } from "./types";

const error = (message: string, extra: Partial<RunResult> = {}): RunResult => ({
  status: "error",
  results: [],
  requirementErrors: [],
  output: "",
  error: message,
  ...extra,
});

const summary = (e: PythonError) => `${e.kind}: ${e.message}`.trim();

/**
 * Runs the learner's code for the Fix step: constraints first (by parsing, so
 * no runtime is needed), then the tests in the Python worker. `run` can be
 * replaced in unit tests.
 */
export async function runExercise(
  exercise: Exercise,
  code: string,
  run: PythonRun = runPython
): Promise<RunResult> {
  const fix = exercise.fix;
  if (!fix) return error("This exercise has no code to run.");

  const analysis = checkConstraints(code, fix.constraints);
  if (analysis.violations.length > 0) {
    return {
      status: "failed",
      results: [],
      requirementErrors: analysis.violations.map((v) =>
        v.line ? `${v.message} (line ${v.line})` : v.message
      ),
      output: "",
    };
  }

  const outcome = await run({ code, setup: fix.setup, tests: fix.tests.map((t) => ({ input: t.input, expected: t.expected })) });

  if (outcome.kind === "timeout") {
    return error(
      `Your code ran for more than ${RUN_TIMEOUT_MS / 1000} seconds and was stopped. Look for a loop that never ends.`,
      { timedOut: true }
    );
  }
  if (outcome.kind === "unavailable") {
    return error(outcome.message, { unavailable: true });
  }

  const { result } = outcome;
  if (result.load) {
    const where = result.load.phase === "setup" ? "The exercise setup failed" : null;
    return error(where ? `${where}: ${summary(result.load)}` : result.load.traceback, {
      output: result.stdout,
      errorLine: result.load.phase === "code" ? result.load.line ?? undefined : undefined,
    });
  }

  const results: TestResult[] = fix.tests.map((t, index) => {
    const r = result.tests[index];
    return {
      index,
      description: t.description,
      input: t.input,
      expectedOutput: t.expected,
      actualOutput: r?.actual ?? "",
      passed: r?.passed ?? false,
      error: r?.error ? r.error.traceback : undefined,
    };
  });

  return {
    status: results.every((r) => r.passed) ? "passed" : "failed",
    results,
    requirementErrors: [],
    output: result.stdout,
  };
}
