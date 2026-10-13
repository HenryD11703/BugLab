"use client";

import { useState } from "react";
import { checkExplain, checkLocate, checkPredict, type LocateVerdict } from "@/lib/steps";
import type { Exercise } from "@/lib/types";
import CodeBlock from "../CodeBlock";
import { InlineMarkdown } from "../Markdown";

interface StepProps {
  /** The learner already completed this step (from saved progress). */
  done: boolean;
  onDone: () => void;
  onSkip: () => void;
  /** Label of the next step, for the Continue button. Null when this is the last one. */
  nextLabel: string | null;
  onContinue: () => void;
}

function Actions({ done, nextLabel, onSkip, onContinue, children }: Pick<StepProps, "done" | "nextLabel" | "onSkip" | "onContinue"> & { children?: React.ReactNode }) {
  return (
    <div className="row-actions">
      {done ? (
        nextLabel && (
          <button type="button" className="btn" onClick={onContinue}>
            Continue to {nextLabel} →
          </button>
        )
      ) : (
        <>
          {children}
          <button type="button" className="btn ghost" onClick={onSkip}>
            Skip
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Predict */

export function PredictStep({ exercise, ...step }: StepProps & { exercise: Exercise }) {
  const predict = exercise.predict!;
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(0);
  const [right, setRight] = useState(false);
  const isRight = step.done || right;
  const lines = predict.code.split("\n");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checkPredict(typed, predict.answer)) {
      setRight(true);
      step.onDone();
    } else {
      setWrong((n) => n + 1);
    }
  }

  return (
    <div>
      <p className="prompt">
        Read the code. Before running anything: what does the <strong>last line</strong> below give?
      </p>
      <CodeBlock code={exercise.buggyCode} label="The code to read" />
      <div className="repl" role="group" aria-label="Calls to evaluate" tabIndex={0}>
        {lines.map((l, i) => (
          <div key={i}><span className="p">&gt;&gt;&gt; </span>{l}</div>
        ))}
      </div>

      {isRight ? (
        <div className="feedback good" role="status">
          Right. It gives <code className="inline">{predict.answer}</code>. Keep that result in mind: it is the bug showing itself.
        </div>
      ) : (
        <form onSubmit={submit}>
          <label className="ans">
            <span className="p" aria-hidden="true">→</span>
            <span className="sr-only">Your answer</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="type the output, or the error name"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
          <div className="row-actions">
            <button type="submit" className="btn" disabled={typed.trim() === ""}>Check</button>
            <button type="button" className="btn ghost" onClick={step.onSkip}>Skip</button>
          </div>
          {wrong > 0 && (
            <div className="feedback" role="status">
              Not quite. Go through the code line by line, as Python would, and try again.
              {wrong >= 2 && " An error counts as an answer too: type its name, like TypeError."}
            </div>
          )}
        </form>
      )}

      {isRight && <Actions {...step} done />}
    </div>
  );
}

/* ----------------------------------------------------------------- Locate */

function locateMessage(v: LocateVerdict): string {
  switch (v.status) {
    case "empty":
      return "Click a line first to mark it.";
    case "partial":
      return `You found ${v.found} of ${v.total} bugs. Keep looking, and mark every line that is part of a bug.`;
    case "wrong":
      return "That is not the problem. Ask of each line: what does it do when the function runs?";
    case "correct":
      return "Found it.";
  }
}

export function LocateStep({ exercise, ...step }: StepProps & { exercise: Exercise }) {
  const bugs = exercise.locate!.bugs;
  const [selected, setSelected] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<LocateVerdict | null>(null);
  const found = step.done || verdict?.status === "correct";
  const bugLines = bugs.map((b) => b.lines[0]);

  function toggle(n: number) {
    setVerdict(null);
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n].sort((a, b) => a - b)));
  }

  function check() {
    const v = checkLocate(selected, bugs);
    setVerdict(v);
    if (v.status === "correct") step.onDone();
  }

  return (
    <div>
      <p className="prompt">
        {bugs.length > 1 ? `There are ${bugs.length} bugs.` : "One part of the code causes the problem."}{" "}
        <strong>Click a line</strong> to mark it, then check.
      </p>
      {found ? (
        <CodeBlock code={exercise.buggyCode} label="The code, with the bug pointed out" bug={bugLines} pointAt={bugLines} />
      ) : (
        <CodeBlock
          code={exercise.buggyCode}
          label="The code. Each line is a button: press one to mark it."
          marked={selected}
          onToggleLine={toggle}
        />
      )}

      {found ? (
        <div className="feedback good" role="status">
          Found it. The line{bugLines.length > 1 ? "s" : ""} marked in red {bugLines.length > 1 ? "are" : "is"} where the bug is.
        </div>
      ) : (
        <>
          <div className="row-actions">
            <button type="button" className="btn" onClick={check} disabled={selected.length === 0}>
              Check {selected.length > 1 ? "lines" : "line"}
            </button>
            <button type="button" className="btn ghost" onClick={step.onSkip}>Skip</button>
            <span className="mono dim" style={{ fontSize: 12 }}>
              {selected.length === 0 ? "no line marked" : `${selected.length} marked`}
            </span>
          </div>
          {verdict && verdict.status !== "empty" && (
            <div className="feedback" role="status">{locateMessage(verdict)}</div>
          )}
        </>
      )}
      {found && <Actions {...step} done />}
    </div>
  );
}

/* ---------------------------------------------------------------- Explain */

export function ExplainStep({ exercise, ...step }: StepProps & { exercise: Exercise }) {
  const explain = exercise.explain!;
  const [choice, setChoice] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [right, setRight] = useState(false);
  const isRight = step.done || right;
  const shown = isRight ? explain.correct : choice;

  function check() {
    if (checkExplain(choice, explain.correct)) {
      setRight(true);
      step.onDone();
    } else {
      setWrong(true);
    }
  }

  return (
    <div>
      <p className="prompt" id="explain-q"><InlineMarkdown text={explain.question} /></p>
      <div className="opts" role="radiogroup" aria-labelledby="explain-q">
        {explain.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className="opt"
            role="radio"
            aria-checked={shown === i}
            disabled={isRight}
            onClick={() => {
              setChoice(i);
              setWrong(false);
            }}
          >
            <span className="k2" aria-hidden="true">{String.fromCharCode(97 + i)}</span>
            <span><InlineMarkdown text={o} /></span>
          </button>
        ))}
      </div>

      {isRight ? (
        <div className="feedback good" role="status">Yes. That is the reason.</div>
      ) : (
        <>
          <div className="row-actions">
            <button type="button" className="btn" onClick={check} disabled={choice === null}>Check</button>
            <button type="button" className="btn ghost" onClick={step.onSkip}>Skip</button>
          </div>
          {wrong && (
            <div className="feedback" role="status">
              Not that one. Re-read the code and think about what Python does at that line.
            </div>
          )}
        </>
      )}
      {isRight && <Actions {...step} done />}
    </div>
  );
}
