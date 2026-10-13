/**
 * The learner's progress as plain data, with no browser APIs, so it can be
 * parsed, migrated and updated in unit tests. lib/progress.ts stores it.
 */

export const STEPS = ["predict", "locate", "explain", "fix"] as const;
export type Step = (typeof STEPS)[number];

export type ReadingStep = "predict" | "locate" | "explain";

export interface ExerciseProgress {
  /** The code in the editor the last time the learner edited it. */
  code?: string;
  /** How many hints have been opened (0 to the number of hints). */
  hintsOpened: number;
  /** Steps the learner has completed. */
  done: Partial<Record<Step, true>>;
  /** Wrong answers per reading step in this attempt. */
  wrong: Partial<Record<ReadingStep, number>>;
  /** Runs of the tests that did not pass in this attempt. */
  failedRuns: number;
  /** The solution was opened before Fix was solved in this attempt. */
  solutionViewed?: true;
  /**
   * Hints that were open when Fix was solved. Hints opened afterwards are
   * for reading, and must not change the score of an exercise already solved.
   */
  hintsAtSolve?: number;
  /** Best score (0 to 100) over all attempts. Repeating never lowers it. */
  best?: number;
}

export interface ProgressData {
  version: 2;
  exercises: Record<string, ExerciseProgress>;
}

export const STORAGE_KEY = "buglab:progress";
/** Key used before the revamp: a JSON array of solved exercise ids. */
export const LEGACY_KEY = "buglab:completed";

export const EMPTY_EXERCISE: ExerciseProgress = Object.freeze({
  hintsOpened: 0,
  done: Object.freeze({}),
  wrong: Object.freeze({}),
  failedRuns: 0,
}) as ExerciseProgress;

const MAX_COUNT = 999;
const clampCount = (n: unknown): number =>
  typeof n === "number" && Number.isInteger(n) ? Math.min(Math.max(n, 0), MAX_COUNT) : 0;

export const EMPTY_PROGRESS: ProgressData = Object.freeze({
  version: 2,
  exercises: Object.freeze({}),
}) as ProgressData;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function cleanExercise(raw: unknown): ExerciseProgress | null {
  if (!isRecord(raw)) return null;
  const done: Partial<Record<Step, true>> = {};
  if (isRecord(raw.done)) {
    for (const s of STEPS) if (raw.done[s] === true) done[s] = true;
  }
  const hints = typeof raw.hintsOpened === "number" && Number.isInteger(raw.hintsOpened) ? raw.hintsOpened : 0;
  const wrong: Partial<Record<ReadingStep, number>> = {};
  if (isRecord(raw.wrong)) {
    for (const s of ["predict", "locate", "explain"] as const) {
      const n = clampCount(raw.wrong[s]);
      if (n > 0) wrong[s] = n;
    }
  }
  const best = typeof raw.best === "number" && Number.isInteger(raw.best) && raw.best >= 0 && raw.best <= 100 ? raw.best : undefined;
  const atSolve = typeof raw.hintsAtSolve === "number" && Number.isInteger(raw.hintsAtSolve) ? Math.min(Math.max(raw.hintsAtSolve, 0), 10) : undefined;
  return {
    code: typeof raw.code === "string" ? raw.code : undefined,
    hintsOpened: Math.min(Math.max(hints, 0), 10),
    done,
    wrong,
    failedRuns: clampCount(raw.failedRuns),
    ...(raw.solutionViewed === true ? { solutionViewed: true as const } : {}),
    ...(atSolve !== undefined ? { hintsAtSolve: atSolve } : {}),
    ...(best !== undefined ? { best } : {}),
  };
}

/**
 * Reads stored progress. Anything unreadable or malformed falls back to
 * empty (or to whatever part is valid): progress must never break the page.
 */
export function parseProgress(raw: string | null, legacyRaw: string | null = null): ProgressData {
  const exercises: Record<string, ExerciseProgress> = {};

  // Old format: only the ids of solved exercises. Keep them solved.
  if (legacyRaw) {
    try {
      const ids: unknown = JSON.parse(legacyRaw);
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === "string") exercises[id] = { hintsOpened: 0, done: { fix: true }, wrong: {}, failedRuns: 0 };
        }
      }
    } catch {
      // ignore a corrupt legacy value
    }
  }

  if (raw) {
    try {
      const data: unknown = JSON.parse(raw);
      if (isRecord(data) && data.version === 2 && isRecord(data.exercises)) {
        for (const [id, value] of Object.entries(data.exercises)) {
          const ex = cleanExercise(value);
          if (ex) exercises[id] = ex;
        }
      }
    } catch {
      // ignore corrupt data and keep what the legacy value gave us
    }
  }

  return Object.keys(exercises).length === 0 ? EMPTY_PROGRESS : { version: 2, exercises };
}

export type ProgressAction =
  | { type: "saveCode"; id: string; code: string | undefined }
  | { type: "completeStep"; id: string; step: Step }
  | { type: "setHintsOpened"; id: string; count: number }
  | { type: "recordWrong"; id: string; step: ReadingStep }
  | { type: "recordFailedRun"; id: string }
  | { type: "solutionShown"; id: string }
  | { type: "recordBest"; id: string; score: number }
  /** Starts the exercise over. `wasSolved` keeps it counted as solved even if no score was ever saved. */
  | { type: "repeat"; id: string; wasSolved: boolean };

/** Returns the same object when the action changes nothing (cheap equality for React). */
export function applyAction(state: ProgressData, action: ProgressAction): ProgressData {
  const current = state.exercises[action.id] ?? EMPTY_EXERCISE;
  let next: ExerciseProgress;

  switch (action.type) {
    case "saveCode":
      if (current.code === action.code) return state;
      next = { ...current, code: action.code };
      break;
    case "completeStep":
      if (current.done[action.step]) return state;
      next = { ...current, done: { ...current.done, [action.step]: true } };
      // freeze the hint count at the moment the exercise is solved
      if (action.step === "fix") next.hintsAtSolve = current.hintsOpened;
      break;
    case "recordWrong": {
      // a mistake in a step that is already done is not a mistake: the step is over
      if (current.done[action.step]) return state;
      const n = Math.min((current.wrong[action.step] ?? 0) + 1, MAX_COUNT);
      next = { ...current, wrong: { ...current.wrong, [action.step]: n } };
      break;
    }
    case "recordFailedRun":
      if (current.done.fix) return state;
      next = { ...current, failedRuns: Math.min(current.failedRuns + 1, MAX_COUNT) };
      break;
    case "solutionShown":
      if (current.done.fix || current.solutionViewed) return state;
      next = { ...current, solutionViewed: true };
      break;
    case "recordBest": {
      const score = Math.min(Math.max(Math.round(action.score), 0), 100);
      if (current.best !== undefined && score <= current.best) return state;
      next = { ...current, best: score };
      break;
    }
    case "repeat": {
      const best = current.best ?? (action.wasSolved ? 0 : undefined);
      const fresh: ExerciseProgress = { hintsOpened: 0, done: {}, wrong: {}, failedRuns: 0, ...(best !== undefined ? { best } : {}) };
      if (!state.exercises[action.id]) return state;
      next = fresh;
      break;
    }
    case "setHintsOpened": {
      // opening hints only ever goes forward
      const count = Math.min(Math.max(Math.trunc(action.count), 0), 10);
      if (count <= current.hintsOpened) return state;
      next = { ...current, hintsOpened: count };
      break;
    }
  }

  return { version: 2, exercises: { ...state.exercises, [action.id]: next } };
}

export const isSolved = (p: ExerciseProgress | undefined): boolean => p?.done.fix === true;

/** Hints that count against the score: those open when Fix was solved, or all of them before that. */
export const hintsForScore = (p: ExerciseProgress): number => p.hintsAtSolve ?? p.hintsOpened;

/**
 * An exercise is complete when its Fix step is solved, or, if it has no Fix
 * step, when every step it declares is done.
 */
export function isComplete(p: ExerciseProgress | undefined, declared: readonly Step[]): boolean {
  if (!p || declared.length === 0) return false;
  return declared.includes("fix") ? p.done.fix === true : declared.every((s) => p.done[s] === true);
}

/** Solved now, or solved in an earlier attempt that was repeated since. */
export function isSolvedEver(p: ExerciseProgress | undefined, declared: readonly Step[]): boolean {
  return p?.best !== undefined || isComplete(p, declared);
}

/** True when the learner has done anything at all in the current attempt. */
export function isStarted(p: ExerciseProgress | undefined): boolean {
  return Boolean(
    p && (p.code !== undefined || p.hintsOpened > 0 || p.failedRuns > 0 || Object.keys(p.done).length > 0 || Object.keys(p.wrong).length > 0)
  );
}

export function solvedIds(state: ProgressData): string[] {
  return Object.entries(state.exercises)
    .filter(([, p]) => isSolved(p))
    .map(([id]) => id);
}
