import { useCallback, useEffect } from "react";
import { prepareRunner, retryRunner, useRunnerState } from "./runner";
import { runExercise } from "./runExercise";
import type { Exercise, RunResult } from "./types";

/** Loads the Python runtime when a component that runs code mounts. */
export function usePythonRunner() {
  const { status, message } = useRunnerState();

  useEffect(() => {
    prepareRunner();
  }, []);

  const run = useCallback(
    (exercise: Exercise, code: string): Promise<RunResult> => runExercise(exercise, code),
    []
  );

  return { status, message, run, retry: retryRunner };
}
