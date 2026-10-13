import type { Step } from "./progress-model";

/**
 * The score of one exercise: a pure function of what the learner did, so it
 * can be tested without a browser and shown in exactly one way everywhere.
 * The rules are written down in docs/01-spec.md ("Score and repeat").
 */

export const WEIGHTS: Record<Step, number> = { predict: 20, locate: 20, explain: 20, fix: 40 };

export const PENALTY = {
  /** A wrong answer in Predict, Locate or Explain. */
  wrongAnswer: 5,
  /** A run of the tests that does not pass. */
  failedRun: 3,
  /** Each hint opened. Taken from the total, not from a step. */
  hint: 5,
} as const;

/** A step the learner completed is always worth at least this (before scaling). */
export const STEP_FLOOR = 5;

export const MAX_SCORE = 100;

export type Grade = "S" | "A" | "B" | "C";

export interface ScoreInput {
  /** Steps the exercise has. */
  declared: readonly Step[];
  done: Partial<Record<Step, true>>;
  /** Wrong answers per reading step. */
  wrong: Partial<Record<"predict" | "locate" | "explain", number>>;
  failedRuns: number;
  hintsOpened: number;
  /** The solution was opened before Fix was solved. */
  solutionViewed: boolean;
}

export type LineStatus = "done" | "skipped" | "solution";

export interface ScoreLine {
  step: Step;
  status: LineStatus;
  /** Points the step is worth when done without a mistake. */
  max: number;
  /** Points this step is worth now. */
  earned: number;
  /** Points lost to mistakes in this step. */
  lost: number;
  mistakes: number;
}

export interface Score {
  lines: ScoreLine[];
  hints: { count: number; lost: number };
  /** 0 to 100. */
  total: number;
  grade: Grade;
}

export function gradeFor(total: number): Grade {
  if (total >= 95) return "S";
  if (total >= 80) return "A";
  if (total >= 60) return "B";
  return "C";
}

export function computeScore(input: ScoreInput): Score {
  const declared = [...input.declared];
  const weightSum = declared.reduce((n, s) => n + WEIGHTS[s], 0);
  // An exercise with fewer steps is scaled so that a perfect run is still 100.
  const scale = weightSum === 0 ? 0 : MAX_SCORE / weightSum;

  const lines: ScoreLine[] = declared.map((step) => {
    const weight = WEIGHTS[step];
    const mistakes = step === "fix" ? input.failedRuns : (input.wrong[step] ?? 0);
    const unit = step === "fix" ? PENALTY.failedRun : PENALTY.wrongAnswer;
    const max = Math.round(weight * scale);

    if (!input.done[step]) {
      return { step, status: "skipped", max, earned: 0, lost: 0, mistakes };
    }
    if (step === "fix" && input.solutionViewed) {
      return { step, status: "solution", max, earned: 0, lost: max, mistakes };
    }
    const raw = Math.max(Math.min(STEP_FLOOR, weight), weight - mistakes * unit);
    const earned = Math.round(raw * scale);
    return { step, status: "done", max, earned, lost: max - earned, mistakes };
  });

  const hintLost = Math.max(0, input.hintsOpened) * PENALTY.hint;
  const sum = lines.reduce((n, l) => n + l.earned, 0);
  const total = Math.min(MAX_SCORE, Math.max(0, sum - hintLost));

  return { lines, hints: { count: Math.max(0, input.hintsOpened), lost: hintLost }, total, grade: gradeFor(total) };
}

/**
 * The most the learner can still earn, assuming every pending step is done
 * without another mistake. It starts at 100 and only goes down: it is what the
 * live indicator shows, so each mistake is visible the moment it costs points.
 */
export function scoreCeiling(input: ScoreInput): number {
  const all: Partial<Record<Step, true>> = {};
  for (const s of input.declared) all[s] = true;
  return computeScore({ ...input, done: all }).total;
}

/** The score as the home page shows it: "91 · A". */
export function formatScore(total: number, grade: Grade): string {
  return `${total} · ${grade}`;
}
