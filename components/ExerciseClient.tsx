"use client";

import { useState } from "react";
import { Exercise, RunResult } from "@/lib/types";
import { usePyodide } from "@/lib/usePyodide";
import dynamic from "next/dynamic";
import TestResults from "./TestResults";
import HintsPanel from "./HintsPanel";
import Link from "next/link";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-[#111111] flex items-center justify-center">
      <span
        className="text-xs text-[#666666] tracking-widest uppercase"
        style={{ fontFamily: "var(--font-space-mono), monospace" }}
      >
        Loading editor...
      </span>
    </div>
  ),
});

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#6BCB77",
  medium: "#E8B87F",
  hard: "#E63329",
};

interface ExerciseClientProps {
  exercise: Exercise;
}

export default function ExerciseClient({ exercise }: ExerciseClientProps) {
  const [code, setCode] = useState(exercise.buggyCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { status: pyStatus, runExercise } = usePyodide();

  const handleRun = async () => {
    if (pyStatus !== "ready" || isRunning) return;
    setIsRunning(true);
    setResult(null);
    try {
      const res = await runExercise(code, exercise);
      setResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(exercise.buggyCode);
    setResult(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFAFA]">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 h-12 border-b border-[#0A0A0A] shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 group"
        >
          <span
            className="text-[10px] tracking-[0.2em] uppercase text-[#0A0A0A] group-hover:text-[#E63329] transition-colors"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            ← BugLab
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <span
            className="text-[10px] tracking-[0.15em] uppercase"
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              color: DIFFICULTY_COLOR[exercise.difficulty],
            }}
          >
            {exercise.difficulty}
          </span>
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {pyStatus === "loading"
              ? "loading python..."
              : pyStatus === "ready"
              ? "python ready"
              : pyStatus === "error"
              ? "python error"
              : "initializing"}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — description + hints */}
        <aside
          className="w-[42%] flex flex-col overflow-hidden border-r border-[#0A0A0A]"
          style={{ minWidth: "320px", maxWidth: "520px" }}
        >
          {/* Exercise header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#E0E0E0]">
            <div className="flex flex-wrap gap-2 mb-3">
              {exercise.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] tracking-[0.12em] uppercase text-[#6B6B6B] border border-[#CCCCCC] px-2 py-0.5"
                  style={{ fontFamily: "var(--font-space-mono), monospace" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1
              className="text-2xl font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              {exercise.title}
            </h1>
          </div>

          {/* Description */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div
              className="prose prose-sm max-w-none text-[#1A1A1A] leading-relaxed"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(exercise.description),
              }}
            />

            {/* Requirements badge */}
            {exercise.requirements && (() => {
              const r = exercise.requirements;
              const items: { label: string; value: string; must: boolean }[] = [
                ...(r.mustContainKeyword ?? []).map((k) => ({ label: "must use keyword", value: k, must: true })),
                ...(r.mustContain ?? []).map((k) => ({ label: "must contain", value: k, must: true })),
                ...(r.mustNotCallBuiltin ?? []).map((k) => ({ label: "must not use built-in", value: `${k}()`, must: false })),
                ...(r.mustNotImport ?? []).map((k) => ({ label: "must not import", value: k, must: false })),
                ...(r.mustNotContain ?? []).map((k) => ({ label: "must not contain", value: k, must: false })),
                ...(r.mustUseLoop ? [{ label: "must use a loop", value: "for / while", must: true }] : []),
                ...(r.mustUseRecursion ? [{ label: "must use recursion", value: "", must: true }] : []),
              ];
              if (items.length === 0) return null;
              return (
                <div className="mt-6 border border-[#DDDDDD] p-4">
                  <p
                    className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B] mb-3"
                    style={{ fontFamily: "var(--font-space-mono), monospace" }}
                  >
                    Constraints
                  </p>
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center mb-1">
                      <span className="text-[#E63329] text-xs">{item.must ? "✓" : "✗"}</span>
                      <span
                        className="text-xs text-[#3A3A3A]"
                        style={{ fontFamily: "var(--font-space-mono), monospace" }}
                      >
                        {item.label}{item.value ? <> <code className="bg-[#F0F0F0] px-1">{item.value}</code></> : ""}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Hints */}
          <HintsPanel hints={exercise.hints} />
        </aside>

        {/* Right panel — editor + results */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#111111]">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 h-10 border-b border-[#222222] shrink-0">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-[#555555]"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              solution.py
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="text-[10px] tracking-[0.12em] uppercase text-[#555555] hover:text-[#AAAAAA] transition-colors px-3 py-1 cursor-pointer"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                Reset
              </button>
              <button
                onClick={handleRun}
                disabled={pyStatus !== "ready" || isRunning}
                className={`
                  text-[10px] tracking-[0.12em] uppercase px-4 py-1 font-bold transition-all cursor-pointer
                  ${
                    pyStatus === "ready" && !isRunning
                      ? "bg-[#E63329] text-white hover:bg-[#CC2A22]"
                      : "bg-[#333333] text-[#666666] cursor-not-allowed"
                  }
                `}
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                {isRunning ? "Running..." : "Run →"}
              </button>
            </div>
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={code} onChange={setCode} />
          </div>

          {/* Test results */}
          <div className="bg-[#0D0D0D] shrink-0">
            <TestResults result={result} isRunning={isRunning} />
          </div>
        </main>
      </div>
    </div>
  );
}

// Minimal markdown-to-html: bold, inline code, paragraphs, newlines
function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-space-mono),monospace;background:#F0F0F0;padding:0 3px;font-size:0.8em">$1</code>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/\n/g, "<br/>");
}
