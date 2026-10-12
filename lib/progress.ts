import { useSyncExternalStore } from "react";
import {
  EMPTY_EXERCISE,
  EMPTY_PROGRESS,
  LEGACY_KEY,
  STORAGE_KEY,
  applyAction,
  parseProgress,
  solvedIds,
  type ExerciseProgress,
  type ProgressAction,
  type ProgressData,
  type Step,
} from "./progress-model";

export type { ExerciseProgress, Step } from "./progress-model";

const UNREAD = Symbol("unread");
const listeners = new Set<() => void>();
let cache: { raw: string | null | typeof UNREAD; legacy: string | null; value: ProgressData } = {
  raw: UNREAD,
  legacy: null,
  value: EMPTY_PROGRESS,
};

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // blocked or unavailable: behave as if nothing was saved
  }
}

// useSyncExternalStore needs a referentially stable snapshot, so the parsed
// data is cached until the raw strings in localStorage actually change.
function getSnapshot(): ProgressData {
  const raw = readStorage(STORAGE_KEY);
  const legacy = readStorage(LEGACY_KEY);
  if (raw !== cache.raw || legacy !== cache.legacy) {
    cache = { raw, legacy, value: parseProgress(raw, legacy) };
  }
  return cache.value;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function dispatch(action: ProgressAction) {
  const current = getSnapshot();
  const next = applyAction(current, action);
  if (next === current) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: progress is not saved, the page keeps working
    return;
  }
  listeners.forEach((l) => l());
}

export const saveCode = (id: string, code: string | undefined) => dispatch({ type: "saveCode", id, code });
export const completeStep = (id: string, step: Step) => dispatch({ type: "completeStep", id, step });
export const setHintsOpened = (id: string, count: number) => dispatch({ type: "setHintsOpened", id, count });

/** Progress of one exercise. Before hydration (and on the server) it is empty. */
export function useExerciseProgress(id: string): ExerciseProgress {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().exercises[id] ?? EMPTY_EXERCISE,
    () => EMPTY_EXERCISE
  );
}

const NO_IDS: readonly string[] = [];
let idsCache: { source: ProgressData; ids: readonly string[] } = { source: EMPTY_PROGRESS, ids: NO_IDS };

/** Ids of exercises whose Fix step is solved. */
export function useCompleted(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      const data = getSnapshot();
      if (idsCache.source !== data) idsCache = { source: data, ids: solvedIds(data) };
      return idsCache.ids;
    },
    () => NO_IDS
  );
}

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
