import type { ExerciseData } from "./schema";

export type { Constraints } from "./schema";

export type Difficulty = ExerciseData["difficulty"];

export type TestCase = NonNullable<ExerciseData["fix"]>["tests"][number];

/** A validated exercise plus what the loader adds from the folder. */
export type Exercise = ExerciseData & {
  id: string;
  /** The code the learner starts with (buggy.py). */
  buggyCode: string;
};

export interface ExerciseMeta {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
}

export type TestStatus = "idle" | "running" | "passed" | "failed" | "error";

export interface TestResult {
  index: number;
  description?: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
}

export interface RunResult {
  status: TestStatus;
  results: TestResult[];
  requirementErrors: string[];
  output: string;
  /** Traceback or message when the code could not run to the tests. */
  error?: string;
  /** 1-indexed line of the learner's code the error points at. */
  errorLine?: number;
  /** The run was stopped after the time limit. */
  timedOut?: boolean;
  /** The Python runtime could not be loaded (offline, blocked). */
  unavailable?: boolean;
}
