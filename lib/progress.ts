import { useSyncExternalStore } from "react";

const KEY = "buglab:completed";
const EMPTY: readonly string[] = [];
const UNREAD = Symbol("unread");

const listeners = new Set<() => void>();
let cache: { raw: string | null | typeof UNREAD; value: readonly string[] } = {
  raw: UNREAD,
  value: EMPTY,
};

function parse(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

// useSyncExternalStore needs a referentially stable snapshot, so the parsed
// array is cached until the raw string in localStorage actually changes.
function getSnapshot(): readonly string[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) cache = { raw, value: parse(raw) };
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

export function markCompleted(id: string) {
  const current = getSnapshot();
  if (current.includes(id)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...current, id]));
  } catch {
    // localStorage unavailable (private mode, blocked): progress is not saved
    return;
  }
  listeners.forEach((l) => l());
}

export function useCompleted(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
