/**
 * The learner's progress as plain data, with no browser APIs, so it can be
 * parsed, migrated and updated in unit tests. lib/progress.ts stores it.
 */

export const STEPS = ["predict", "locate", "explain", "fix"] as const;
export type Step = (typeof STEPS)[number];

export interface ExerciseProgress {
  /** The code in the editor the last time the learner edited it. */
  code?: string;
  /** How many hints have been opened (0 to the number of hints). */
  hintsOpened: number;
  /** Steps the learner has completed. */
  done: Partial<Record<Step, true>>;
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
}) as ExerciseProgress;

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
  return {
    code: typeof raw.code === "string" ? raw.code : undefined,
    hintsOpened: Math.min(Math.max(hints, 0), 10),
    done,
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
          if (typeof id === "string") exercises[id] = { hintsOpened: 0, done: { fix: true } };
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
  | { type: "setHintsOpened"; id: string; count: number };

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
      break;
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

/**
 * An exercise is complete when its Fix step is solved, or, if it has no Fix
 * step, when every step it declares is done.
 */
export function isComplete(p: ExerciseProgress | undefined, declared: readonly Step[]): boolean {
  if (!p || declared.length === 0) return false;
  return declared.includes("fix") ? p.done.fix === true : declared.every((s) => p.done[s] === true);
}

/** True when the learner has done anything at all in this exercise. */
export function isStarted(p: ExerciseProgress | undefined): boolean {
  return Boolean(p && (p.code !== undefined || p.hintsOpened > 0 || Object.keys(p.done).length > 0));
}

export function solvedIds(state: ProgressData): string[] {
  return Object.entries(state.exercises)
    .filter(([, p]) => isSolved(p))
    .map(([id]) => id);
}
