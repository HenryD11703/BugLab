import { z } from "zod";

/** Python reserved words a constraint may require (see docs/02-plan.md). */
export const PY_KEYWORDS = [
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def",
  "del", "elif", "else", "except", "finally", "for", "from", "global", "if",
  "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise",
  "return", "try", "while", "with", "yield", "None", "True", "False",
] as const;

const nonEmpty = z.string().trim().min(1);

export const constraintsSchema = z
  .strictObject({
    /** Reserved words the code must contain, e.g. "for", "lambda", "None". */
    mustUseKeyword: z.array(z.enum(PY_KEYWORDS)).min(1),
    /** Names that must be called. A name matches `f(...)` and `obj.f(...)`. */
    mustCall: z.array(nonEmpty).min(1),
    /** Names that must not be called (same matching as `mustCall`). */
    mustNotCall: z.array(nonEmpty).min(1),
    /** Top-level module names that must not be imported. */
    mustNotImport: z.array(nonEmpty).min(1),
    mustUseLoop: z.boolean(),
    mustUseRecursion: z.boolean(),
  })
  .partial();

const testSchema = z.strictObject({
  description: nonEmpty.optional(),
  /** Python expression evaluated after the learner's code has run. */
  input: nonEmpty,
  /** `str()` of the expected value, or the exception class name. */
  expected: z.string(),
});

const predictSchema = z.strictObject({
  /** Statements ending in an expression; the buggy code must define what it calls. */
  code: nonEmpty,
  /** What the buggy code prints for the last expression, or the error class name. */
  answer: nonEmpty,
});

const locateSchema = z.strictObject({
  /**
   * One group per bug. Each group lists the 1-indexed lines of buggy.py that
   * point at that bug; marking any line of a group finds it.
   */
  bugs: z.array(z.strictObject({ lines: z.array(z.number().int().min(1)).min(1) })).min(1),
});

const explainSchema = z
  .strictObject({
    question: nonEmpty,
    options: z.array(nonEmpty).min(3).max(4),
    correct: z.number().int().min(0),
  })
  .refine((e) => e.correct < e.options.length, {
    message: "correct must be a valid index into options",
    path: ["correct"],
  });

const fixSchema = z.strictObject({
  tests: z.array(testSchema).min(3),
  constraints: constraintsSchema.optional(),
  /** Python run before the learner's code. */
  setup: nonEmpty.optional(),
});

export const exerciseSchema = z
  .strictObject({
    title: nonEmpty.max(60),
    difficulty: z.enum(["easy", "medium", "hard"]),
    tags: z.array(nonEmpty).min(1),
    /** Kebab-case name of the underlying pattern, shown after solving. */
    concept: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    /** Markdown. Says what the code should do, never where the bug is. */
    description: nonEmpty,
    hints: z.array(nonEmpty).min(2).max(4),
    /** Markdown. Shown after the exercise is solved. */
    explanation: nonEmpty,
    predict: predictSchema.optional(),
    locate: locateSchema.optional(),
    explain: explainSchema.optional(),
    fix: fixSchema.optional(),
  })
  .refine((e) => e.predict || e.locate || e.explain || e.fix, {
    message: "an exercise needs at least one of predict, locate, explain or fix",
  });

export type ExerciseData = z.infer<typeof exerciseSchema>;
export type Constraints = z.infer<typeof constraintsSchema>;
