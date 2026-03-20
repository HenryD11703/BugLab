export type Difficulty = "easy" | "medium" | "hard";

export interface TestCase {
  description?: string;
  input: string;       // Python expression string, e.g. "solution(3, 5)"
  expectedOutput: string; // Expected stringified result, e.g. "8"
}

export interface Requirements {
  /**
   * Simple string match — safe ONLY for Python reserved keywords (for, while, return, yield, etc.)
   * Cannot be false-positived since reserved words can't be identifiers.
   * Example: ["for", "return"]
   */
  mustContainKeyword?: string[];

  /**
   * AST-based — checks that the user calls none of these as a bare function.
   * `find_max(` will NOT trigger `mustNotCallBuiltin: ["max"]` because AST sees
   * the call target is `find_max`, not `max`.
   * Example: ["max", "sum", "min", "sorted"]
   */
  mustNotCallBuiltin?: string[];

  /**
   * AST-based — checks that the user does not import these modules.
   * Example: ["os", "sys", "subprocess"]
   */
  mustNotImport?: string[];

  /**
   * AST-based — code must contain at least one for or while loop.
   */
  mustUseLoop?: boolean;

  /**
   * AST-based — code must contain a recursive call to a function defined in the code.
   */
  mustUseRecursion?: boolean;

  // Legacy — simple string match on the raw source. Use carefully: prone to false positives.
  // Prefer mustContainKeyword / mustNotCallBuiltin instead.
  mustContain?: string[];
  mustNotContain?: string[];
}

export interface Exercise {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;       // Markdown supported
  buggyCode: string;         // The code the user starts with
  hints: string[];
  tests: TestCase[];
  requirements?: Requirements;
  setupCode?: string;        // Code that runs before user's code (imports, helpers, etc.)
}

/** Internal shape of exercise.json — buggyCode is optional since it may come from buggy.py */
export interface RawExerciseJson extends Omit<Exercise, "buggyCode"> {
  buggyCode?: string;
}

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
  error?: string;
}
