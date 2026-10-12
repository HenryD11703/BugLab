"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePythonRunner } from "@/lib/usePythonRunner";
import type { Exercise, RunResult } from "@/lib/types";
import { Markdown } from "../Markdown";
import Results from "./Results";

import { RUN_EVENT } from "../runEvent";

const CodeEditor = dynamic(() => import("../CodeEditor"), {
  ssr: false,
  loading: () => <div className="mono dim" style={{ padding: 16, fontSize: 12 }}>Loading editor…</div>,
});

interface FixStepProps {
  exercise: Exercise;
  code: string;
  onCodeChange: (code: string) => void;
  onReset: () => void;
  /** The last run. Kept by the parent so it survives switching steps. */
  result: RunResult | null;
  onResult: (result: RunResult | null, seconds: number) => void;
  seconds: number | undefined;
  onSolved: () => void;
  solved: boolean;
  next: { id: string; title: string } | null;
}

const STATE_LABEL = { idle: "python idle", loading: "loading python…", ready: "python ready", error: "python unavailable" } as const;

export default function FixStep({
  exercise, code, onCodeChange, onReset, result, onResult, seconds, onSolved, solved, next,
}: FixStepProps) {
  const { status, message, run, retry } = usePythonRunner();
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const handleRun = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    onResult(null, 0);
    const started = performance.now();
    try {
      const res = await run(exercise, code);
      onResult(res, (performance.now() - started) / 1000);
      if (res.status === "passed") onSolved();
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [run, exercise, code, onResult, onSolved]);

  // Ctrl/Cmd+Enter inside the editor announces itself with an event
  useEffect(() => {
    const onRunKey = () => void handleRun();
    document.addEventListener(RUN_EVENT, onRunKey);
    return () => document.removeEventListener(RUN_EVENT, onRunKey);
  }, [handleRun]);

  const showSolved = solved || result?.status === "passed";

  return (
    <div>
      <div className="editor-head">
        <span>solution.py</span>
        <span className="acts">
          <span className={`pystate ${status}`} role="status">
            {STATE_LABEL[status]}
            {status === "error" && (
              <button type="button" className="linkbtn" style={{ marginLeft: 8, textDecoration: "underline" }} onClick={retry} title={message ?? undefined}>
                retry
              </button>
            )}
          </span>
          <button type="button" className="linkbtn" onClick={onReset}>reset</button>
          <span className="kbd" aria-hidden="true">ctrl ↵</span>
          <button type="button" className="btn small" onClick={handleRun} disabled={running}>
            {running ? (status === "loading" ? "Loading Python…" : "Running…") : "Run →"}
          </button>
        </span>
      </div>

      <div className="editor">
        <CodeEditor value={code} onChange={onCodeChange} label="Your solution. Press Control or Command and Enter to run. Press Escape then Tab to leave the editor." />
      </div>
      <p className="mono dim kbdhint" style={{ fontSize: 11, margin: "8px 0 0" }}>
        Keyboard: <span className="kbd">esc</span> then <span className="kbd">tab</span> leaves the editor.
      </p>

      <Results result={result} running={running} seconds={seconds} />

      {showSolved && (
        <section className="solved" aria-labelledby="solved-title">
          <span className="found">The bug you found</span>
          <h2 id="solved-title">{exercise.concept}</h2>
          <Markdown text={exercise.explanation} />
          <div className="row-actions">
            {next && (
              <Link className="btn" href={`/exercise/${next.id}`}>
                Next: {next.id.slice(0, 3)} {next.title} →
              </Link>
            )}
            <Link className="btn ghost" href="/#exercises">Back to the list</Link>
          </div>
        </section>
      )}
    </div>
  );
}
