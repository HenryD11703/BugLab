"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isSolvedEver, isStarted, STEPS, type Step } from "@/lib/progress-model";
import { gradeFor } from "@/lib/score";
import { useProgressData } from "@/lib/progress";
import type { Difficulty } from "@/lib/types";

export interface ExerciseRow {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  concept: string;
  steps: Step[];
}

const FILTERS = ["all", "easy", "medium", "hard"] as const;
const LETTER: Record<Step, string> = { predict: "P", locate: "L", explain: "E", fix: "F" };

export default function ExerciseTable({ rows }: { rows: ExerciseRow[] }) {
  const progress = useProgressData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");

  const state = (r: ExerciseRow) => {
    const p = progress.exercises[r.id];
    return isSolvedEver(p, r.steps) ? "solved" : isStarted(p) ? "progress" : "open";
  };
  const solvedCount = rows.filter((r) => state(r) === "solved").length;
  const points = rows.reduce((n, r) => n + (progress.exercises[r.id]?.best ?? 0), 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.difficulty !== filter) return false;
      if (!q) return true;
      // Search never matches the hidden bug name (the folder slug and the concept
      // both give it away), only the number, the title, the topics, and the
      // concept once the exercise is solved.
      const solved = isSolvedEver(progress.exercises[r.id], r.steps);
      const haystack = [r.id.slice(0, 3), r.title, ...r.tags, solved ? r.concept : ""].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, filter, query, progress]);

  return (
    <div className="wrap" id="exercises">
      <div className="progress">
        <span className="label">Solved</span>
        <span className="dots" aria-hidden="true">
          {rows.map((r) => (state(r) === "solved" ? <span key={r.id} className="ok">.</span> : "·"))}
        </span>
        <span className="count">
          <b>{solvedCount}</b> of {rows.length} solved · <b>{points}</b> pts
        </span>
      </div>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter by difficulty">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <label className="search">
          <span aria-hidden="true">/</span>
          <span className="sr-only">Search exercises</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search by title or topic" autoComplete="off" />
        </label>
      </div>

      <div className="list-head" aria-hidden="true">
        <span className="label">#</span><span className="label">Exercise</span><span className="label">The bug</span>
        <span className="label">Steps</span><span className="label">Level</span><span className="label">Status</span>
      </div>

      <div role="list" aria-label="Exercises">
        {visible.map((r) => {
          const p = progress.exercises[r.id];
          const s = state(r);
          return (
            <Link key={r.id} href={`/exercise/${r.id}`} className="row" role="listitem">
              <span className="num">{r.id.slice(0, 3)}</span>
              <span>
                <span className="title">{r.title}</span>
                <span className="tags" style={{ display: "block" }}>{r.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
              </span>
              <span className={`concept ${s === "solved" ? "found" : "unknown"}`}>{s === "solved" ? r.concept : "not found yet"}</span>
              <span className="mini">
                <span className="steps" role="img" aria-label={`Steps done: ${STEPS.filter((x) => p?.done[x]).join(", ") || "none"}`}>
                  {r.steps.map((x) => <b key={x} className={p?.done[x] ? "on" : "off"}>{LETTER[x]}</b>).flatMap((el, i) => (i ? [" ", el] : [el]))}
                </span>
                <span className={`diff ${r.difficulty}`}>{r.difficulty}</span>
              </span>
              <span className="statecell">
                <span className={`state ${s === "progress" ? "doing" : s}`}>{s === "solved" ? "● solved" : s === "progress" ? "in progress" : "open"}</span>
                {s === "solved" && p?.best !== undefined && p.best > 0 && (
                  <span className="rowscore">
                    <span className="sr-only">Best score </span>
                    {p.best} · <span className={`grade g-${gradeFor(p.best)}`}><span className="sr-only">grade </span>{gradeFor(p.best)}</span>
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      {visible.length === 0 && <p className="empty">No exercise matches. Clear the search or pick another level.</p>}
    </div>
  );
}
