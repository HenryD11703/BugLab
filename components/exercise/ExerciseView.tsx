"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { describeConstraints } from "@/lib/analysis";
import {
  completeStep, recordBest, recordFailedRun, recordWrong, repeatExercise, saveCode, setHintsOpened, solutionShown,
  useExerciseProgress, useHydrated,
} from "@/lib/progress";
import { hintsForScore, isComplete, isSolvedEver, isStarted, STEPS, type ReadingStep, type Step } from "@/lib/progress-model";
import { computeScore, scoreCeiling, type ScoreInput } from "@/lib/score";
import type { Exercise, RunResult } from "@/lib/types";
import { Markdown } from "../Markdown";
import { Wordmark } from "../SiteHeader";
import FixStep from "./FixStep";
import Hints from "./Hints";
import RepeatControl from "./RepeatControl";
import { ExplainStep, LocateStep, PredictStep } from "./Steps";

const LABEL: Record<Step, string> = { predict: "Predict", locate: "Locate", explain: "Explain", fix: "Fix" };

interface ExerciseViewProps {
  exercise: Exercise;
  position: { n: number; total: number };
  next: { id: string; title: string } | null;
}

export default function ExerciseView({ exercise, position, next }: ExerciseViewProps) {
  const progress = useExerciseProgress(exercise.id);
  const hydrated = useHydrated();
  const steps = useMemo(() => STEPS.filter((s) => exercise[s]), [exercise]);
  const [active, setActive] = useState<Step>(steps[0]);
  const [mobile, setMobile] = useState<"read" | "work">("read");
  const [result, setResult] = useState<RunResult | null>(null);
  const [seconds, setSeconds] = useState<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  // Bumped by Repeat: remounts the steps and hints so their local state starts clean.
  const [epoch, setEpoch] = useState(0);

  // The saved draft is only known after hydration; until the learner edits,
  // the editor shows it. Once they edit, their own text wins.
  const [edited, setEdited] = useState<string | null>(null);
  const code = edited ?? (hydrated ? progress.code ?? exercise.buggyCode : exercise.buggyCode);
  const onCodeChange = useCallback(
    (next: string) => {
      setEdited(next);
      saveCode(exercise.id, next === exercise.buggyCode ? undefined : next);
    },
    [exercise.id, exercise.buggyCode]
  );
  const onReset = useCallback(() => {
    onCodeChange(exercise.buggyCode);
    setResult(null);
  }, [onCodeChange, exercise.buggyCode]);
  const onResult = useCallback((r: RunResult | null, s: number) => {
    setResult(r);
    setSeconds(r ? s : undefined);
  }, []);
  const onFixSolved = useCallback(() => completeStep(exercise.id, "fix"), [exercise.id]);

  const solved = isComplete(progress, steps);
  const solvedEver = isSolvedEver(progress, steps);

  const scoreInput: ScoreInput = {
    declared: steps,
    done: progress.done,
    wrong: progress.wrong,
    failedRuns: progress.failedRuns,
    hintsOpened: hydrated ? hintsForScore(progress) : 0,
    solutionViewed: progress.solutionViewed === true,
  };
  const score = computeScore(scoreInput);
  const ceiling = scoreCeiling(scoreInput);
  const best = Math.max(progress.best ?? 0, solved ? score.total : 0);

  // Keep the best score of every attempt. Repeating never lowers it.
  useEffect(() => {
    if (solved && score.total > (progress.best ?? -1)) recordBest(exercise.id, score.total);
  }, [solved, score.total, progress.best, exercise.id]);

  const repeat = useCallback(() => {
    repeatExercise(exercise.id, solvedEver);
    setEdited(null);
    setResult(null);
    setSeconds(undefined);
    setActive(steps[0]);
    setEpoch((n) => n + 1);
    window.scrollTo(0, 0);
  }, [exercise.id, solvedEver, steps]);
  const repeatControl = (variant: "bar" | "panel") => (
    <RepeatControl variant={variant} needsConfirm={isStarted(progress)} best={progress.best} onRepeat={repeat} />
  );
  const constraints = exercise.fix?.constraints ? describeConstraints(exercise.fix.constraints) : [];

  const goNext = (from: Step) => {
    const i = steps.indexOf(from);
    if (i < steps.length - 1) setActive(steps[i + 1]);
  };
  const stepProps = (s: Step) => ({
    done: progress.done[s] === true,
    onDone: () => completeStep(exercise.id, s),
    onWrong: () => recordWrong(exercise.id, s as ReadingStep),
    onSkip: () => goNext(s),
    nextLabel: steps[steps.indexOf(s) + 1] ? LABEL[steps[steps.indexOf(s) + 1]] : null,
    onContinue: () => goNext(s),
  });

  function onTabKey(e: React.KeyboardEvent) {
    const i = steps.indexOf(active);
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (to === null || to < 0 || to >= steps.length) return;
    e.preventDefault();
    setActive(steps[to]);
    document.getElementById(`tab-${steps[to]}`)?.focus();
  }

  function share() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="page-exercise" data-m={mobile}>
      <header className="bar full">
        <div className="wrap">
          <Wordmark />
          <span className="crumb" aria-label={`Exercise ${position.n} of ${position.total}`}>
            <b>{String(position.n).padStart(3, "0")}</b> / {String(position.total).padStart(3, "0")}
          </span>
          <span className="bar-right">
            <span
              className="chip"
              role="status"
              aria-label={solved ? `Score ${score.total}, grade ${score.grade}` : `You can still earn up to ${ceiling} points`}
            >
              {solved ? (
                <>
                  <b>{score.total}</b> pts · <span className={`grade g-${score.grade}`}>{score.grade}</span>
                </>
              ) : (
                <>
                  up to <b>{ceiling}</b>
                </>
              )}
            </span>
            {isStarted(progress) && repeatControl("bar")}
            <button type="button" className="linkbtn" onClick={share}>{copied ? "copied ✓" : "copy link"}</button>
          </span>
        </div>
      </header>

      <div className="mtabs" role="tablist" aria-label="Exercise sections">
        {(["read", "work"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mobile === m} onClick={() => { setMobile(m); window.scrollTo(0, 0); }}>
            {m === "read" ? "Read" : "Work"}
          </button>
        ))}
      </div>

      <div className="stage">
        <section className="read" aria-label="Instructions">
          <div className="meta">
            <span>{exercise.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
            <span className={`diff ${exercise.difficulty}`}>{exercise.difficulty}</span>
          </div>
          <h1>{exercise.title}</h1>
          <Markdown text={exercise.description} />

          {constraints.length > 0 && (
            <div className="constraints" aria-label="Rules for your fix">
              <span className="tilde"># your fix</span>
              {constraints.map((c, i) => (
                <div key={i}>
                  <span className={c.must ? "y" : "n"}>{c.must ? "+" : "-"}</span> {c.label}{" "}
                  {c.value && <code style={{ color: "var(--text)" }}>{c.value}</code>}
                </div>
              ))}
            </div>
          )}

          <Hints
            key={epoch}
            exerciseId={exercise.id}
            hints={exercise.hints}
            opened={hydrated ? progress.hintsOpened : 0}
            onOpen={(n) => setHintsOpened(exercise.id, n)}
            onSolutionShown={() => solutionShown(exercise.id)}
            solved={solved}
          />
        </section>

        <section className="work" aria-label="Exercise steps">
          <div className="tabs" role="tablist" aria-label="Steps" onKeyDown={onTabKey}>
            {steps.map((s, i) => (
              <button
                key={s}
                id={`tab-${s}`}
                type="button"
                className="tab"
                role="tab"
                aria-selected={active === s}
                aria-controls={`panel-${s}`}
                tabIndex={active === s ? 0 : -1}
                onClick={() => setActive(s)}
              >
                <span className="no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {LABEL[s]}
                {progress.done[s] && <span className="ok" aria-label="done">✓</span>}
              </button>
            ))}
          </div>

          <div className="panel" role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} key={`${active}-${epoch}`}>
            {active === "predict" && <PredictStep exercise={exercise} {...stepProps("predict")} />}
            {active === "locate" && <LocateStep exercise={exercise} {...stepProps("locate")} />}
            {active === "explain" && <ExplainStep exercise={exercise} {...stepProps("explain")} />}
            {active === "fix" && (
              <FixStep
                exercise={exercise}
                code={code}
                onCodeChange={onCodeChange}
                onReset={onReset}
                result={result}
                onResult={onResult}
                seconds={seconds}
                onSolved={onFixSolved}
                onFailedRun={() => recordFailedRun(exercise.id)}
                solved={progress.done.fix === true}
                next={next}
                score={score}
                best={best}
                repeatControl={repeatControl("panel")}
              />
            )}
          </div>
          {next === null && solved && (
            <p className="mono dim" style={{ marginTop: 28, fontSize: 12 }}>
              That was the last one. <Link href="/#exercises" style={{ textDecoration: "underline" }}>Back to the list</Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
