import { useSyncExternalStore } from "react";

/** What the worker needs for one run. */
export interface RunPayload {
  code: string;
  setup?: string;
  tests: { input: string; expected: string }[];
}

export interface PythonError {
  kind: string;
  message: string;
  /** 1-indexed line in the learner's code, when the error points at it. */
  line: number | null;
  /** Python-style traceback, limited to the learner's own code. */
  traceback: string;
}

export interface WorkerResult {
  stdout: string;
  load: (PythonError & { phase: "setup" | "code" }) | null;
  tests: { actual: string; passed: boolean; error: PythonError | null }[];
}

export type RunOutcome =
  | { kind: "done"; result: WorkerResult }
  | { kind: "timeout" }
  | { kind: "unavailable"; message: string };

export type PythonRun = (payload: RunPayload, timeoutMs?: number) => Promise<RunOutcome>;

export type RunnerStatus = "idle" | "loading" | "ready" | "error";

export const RUN_TIMEOUT_MS = 5000;
const LOAD_TIMEOUT_MS = 90_000;
const WORKER_URL = "/python-worker.js";

interface Snapshot {
  status: RunnerStatus;
  message: string | null;
}

const IDLE: Snapshot = { status: "idle", message: null };
let snapshot: Snapshot = IDLE;
const listeners = new Set<() => void>();

let worker: Worker | null = null;
let readyWaiters: ((ok: { ok: true } | { ok: false; message: string }) => void)[] = [];
let loadTimer: ReturnType<typeof setTimeout> | undefined;

function setSnapshot(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function settleWaiters(outcome: { ok: true } | { ok: false; message: string }) {
  const waiters = readyWaiters;
  readyWaiters = [];
  waiters.forEach((w) => w(outcome));
}

function fail(message: string) {
  clearTimeout(loadTimer);
  worker?.terminate();
  worker = null;
  setSnapshot({ status: "error", message });
  settleWaiters({ ok: false, message });
}

/** Starts downloading the Python runtime if it is not already loading or ready. */
export function prepareRunner(): void {
  if (snapshot.status === "loading" || snapshot.status === "ready") return;
  if (typeof Worker === "undefined") {
    setSnapshot({ status: "error", message: "This browser cannot run the Python runtime." });
    return;
  }
  setSnapshot({ status: "loading", message: null });
  worker = new Worker(WORKER_URL);
  worker.onmessage = (event: MessageEvent) => {
    const msg = event.data;
    if (msg.type === "ready") {
      clearTimeout(loadTimer);
      setSnapshot({ status: "ready", message: null });
      settleWaiters({ ok: true });
    } else if (msg.type === "init-error") {
      fail(msg.message);
    }
  };
  worker.onerror = () => fail("The Python runtime could not be started.");
  loadTimer = setTimeout(
    () => fail("The Python runtime took too long to load. Check your connection."),
    LOAD_TIMEOUT_MS
  );
  worker.postMessage({ type: "init" });
}

/** Forgets a failed load and tries again. */
export function retryRunner(): void {
  if (snapshot.status === "error") {
    setSnapshot(IDLE);
    prepareRunner();
  }
}

const current = (): Snapshot => snapshot;

function whenReady(): Promise<{ ok: true } | { ok: false; message: string }> {
  const unavailable = (): { ok: false; message: string } => ({
    ok: false,
    message: current().message ?? "The Python runtime is not available.",
  });
  if (current().status === "ready") return Promise.resolve({ ok: true });
  if (current().status === "error") return Promise.resolve(unavailable());
  prepareRunner();
  if (current().status === "error") return Promise.resolve(unavailable());
  return new Promise((resolve) => readyWaiters.push(resolve));
}

let nextId = 1;

/**
 * Runs the payload in the worker. If it does not finish within `timeoutMs`
 * the worker is terminated (the only way to stop an infinite loop) and a new
 * one starts loading in the background.
 */
export const runPython: PythonRun = async (payload, timeoutMs = RUN_TIMEOUT_MS) => {
  const ready = await whenReady();
  if (!ready.ok) return { kind: "unavailable", message: ready.message };
  const w = worker;
  if (!w) return { kind: "unavailable", message: "The Python runtime is not available." };

  const id = nextId++;
  return new Promise<RunOutcome>((resolve) => {
    const finish = (outcome: RunOutcome) => {
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      resolve(outcome);
    };
    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === "result" && msg.id === id) finish({ kind: "done", result: msg.result });
    };
    const timer = setTimeout(() => {
      w.terminate();
      worker = null;
      setSnapshot(IDLE);
      finish({ kind: "timeout" });
      prepareRunner();
    }, timeoutMs);
    w.addEventListener("message", onMessage);
    w.postMessage({ type: "run", id, payload });
  });
};

export function useRunnerState(): Snapshot {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    () => snapshot,
    () => IDLE
  );
}
