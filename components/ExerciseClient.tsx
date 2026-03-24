"use client";

import { useState, useCallback, useEffect } from "react";
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
  const [copied, setCopied] = useState(false);
  const { status: pyStatus, runExercise } = usePyodide();

  const handleRun = useCallback(async () => {
    if (pyStatus !== "ready" || isRunning) return;
    setIsRunning(true);
    setResult(null);
    try {
      const res = await runExercise(code, exercise);
      setResult(res);
    } finally {
      setIsRunning(false);
    }
  }, [pyStatus, isRunning, code, exercise, runExercise]);

  const handleReset = () => {
    setCode(exercise.buggyCode);
    setResult(null);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Ctrl+Enter / Cmd+Enter to run — global listener, no ref-during-render issues
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleRun]);

  // Save to localStorage when all tests pass
  useEffect(() => {
    if (result?.status === "passed") {
      try {
        const raw = localStorage.getItem("buglab:completed") ?? "[]";
        const completed: string[] = JSON.parse(raw);
        if (!completed.includes(exercise.id)) {
          localStorage.setItem(
            "buglab:completed",
            JSON.stringify([...completed, exercise.id])
          );
        }
      } catch {
        // localStorage unavailable — ignore
      }
    }
  }, [result, exercise.id]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFAFA]">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 h-12 border-b border-[#0A0A0A] shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="text-[10px] tracking-[0.2em] uppercase text-[#0A0A0A] group-hover:text-[#E63329] transition-colors"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            ← BugLab
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <button
            onClick={handleShare}
            className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors cursor-pointer"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {copied ? "Copied ✓" : "Share"}
          </button>
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
              className="max-w-none text-[#1A1A1A] leading-relaxed text-[0.925rem]"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(exercise.description),
              }}
            />

            {/* Requirements badge */}
            {exercise.requirements &&
              (() => {
                const r = exercise.requirements;
                const items: { label: string; value: string; must: boolean }[] =
                  [
                    ...(r.mustContainKeyword ?? []).map((k) => ({
                      label: "must use keyword",
                      value: k,
                      must: true,
                    })),
                    ...(r.mustContain ?? []).map((k) => ({
                      label: "must contain",
                      value: k,
                      must: true,
                    })),
                    ...(r.mustNotCallBuiltin ?? []).map((k) => ({
                      label: "must not use built-in",
                      value: `${k}()`,
                      must: false,
                    })),
                    ...(r.mustNotImport ?? []).map((k) => ({
                      label: "must not import",
                      value: k,
                      must: false,
                    })),
                    ...(r.mustNotContain ?? []).map((k) => ({
                      label: "must not contain",
                      value: k,
                      must: false,
                    })),
                    ...(r.mustUseLoop
                      ? [
                          {
                            label: "must use a loop",
                            value: "for / while",
                            must: true,
                          },
                        ]
                      : []),
                    ...(r.mustUseRecursion
                      ? [{ label: "must use recursion", value: "", must: true }]
                      : []),
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
                        <span className="text-[#E63329] text-xs">
                          {item.must ? "✓" : "✗"}
                        </span>
                        <span
                          className="text-xs text-[#3A3A3A]"
                          style={{
                            fontFamily: "var(--font-space-mono), monospace",
                          }}
                        >
                          {item.label}
                          {item.value ? (
                            <>
                              {" "}
                              <code className="bg-[#F0F0F0] px-1">
                                {item.value}
                              </code>
                            </>
                          ) : (
                            ""
                          )}
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
              <span
                className="text-[9px] text-[#333333] px-2 hidden sm:inline"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                Ctrl+↵
              </span>
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

// Full markdown-to-HTML: fenced code blocks, bold, italic, inline code, lists, paragraphs
function markdownToHtml(md: string): string {
  // 1. HTML-escape
  let s = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Protect fenced code blocks with placeholders (before inline processing)
  const codeBlocks: string[] = [];
  s = s.replace(/```(?:\w*)\n([\s\S]*?)```/g, (_, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.trimEnd());
    return `\x00CB${idx}\x00`;
  });

  // 3. Bold (**text**)
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 4. Italic (*text*) — single asterisks not part of **
  s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  // 5. Inline code
  const ic =
    'style="font-family:var(--font-space-mono),monospace;background:#F0F0F0;padding:1px 5px;font-size:0.82em;border-radius:2px"';
  s = s.replace(/`([^`\n]+)`/g, `<code ${ic}>$1</code>`);

  // 6. Split into blocks and process each
  const preStyle =
    'style="font-family:var(--font-space-mono),monospace;background:#1A1A1A;color:#E8E8E8;padding:0.8rem 1rem;font-size:0.8em;overflow-x:auto;margin:0.75em 0;line-height:1.65;border-radius:2px"';
  const ulStyle =
    'style="margin:0.3em 0 0.7em;padding-left:1.4em;list-style:disc"';
  const pStyle = 'style="margin:0 0 0.75em 0"';

  const html = s
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return "";

      // Fenced code block placeholder
      if (/^\x00CB\d+\x00$/.test(block)) {
        const idx = parseInt(block.slice(3, -1));
        return `<pre ${preStyle}><code>${codeBlocks[idx]}</code></pre>`;
      }

      const lines = block.split("\n");

      // Pure list block
      if (lines.every((l) => /^[-*] /.test(l.trimStart()))) {
        const items = lines
          .map((l) => `<li>${l.trimStart().slice(2)}</li>`)
          .join("");
        return `<ul ${ulStyle}>${items}</ul>`;
      }

      // Mixed block (some list items, some text)
      if (lines.some((l) => /^[-*] /.test(l.trimStart()))) {
        let out = "";
        let inList = false;
        for (const line of lines) {
          if (/^[-*] /.test(line.trimStart())) {
            if (!inList) {
              out += `<ul ${ulStyle}>`;
              inList = true;
            }
            out += `<li>${line.trimStart().slice(2)}</li>`;
          } else {
            if (inList) {
              out += "</ul>";
              inList = false;
            }
            out += line + "<br/>";
          }
        }
        if (inList) out += "</ul>";
        return out;
      }

      // Regular paragraph
      return `<p ${pStyle}>${lines.join("<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("");

  return html;
}
