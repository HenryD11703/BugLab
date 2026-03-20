"use client";

import { RunResult } from "@/lib/types";

interface TestResultsProps {
  result: RunResult | null;
  isRunning: boolean;
}

export default function TestResults({ result, isRunning }: TestResultsProps) {
  if (isRunning) {
    return (
      <div className="flex items-center gap-3 py-4 px-5 border-t border-[#222222]">
        <div className="w-2 h-2 rounded-full bg-[#E63329] animate-pulse" />
        <span
          className="text-xs text-[#888888] tracking-widest uppercase"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          Running...
        </span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center gap-3 py-4 px-5 border-t border-[#222222]">
        <span
          className="text-xs text-[#555555] tracking-widest uppercase"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          Run your code to see results
        </span>
      </div>
    );
  }

  const allPassed = result.status === "passed";

  return (
    <div className="overflow-y-auto border-t border-[#222222]" style={{ maxHeight: "280px" }}>
      {/* Status header */}
      <div
        className={`flex items-center gap-3 px-5 py-3 ${
          allPassed ? "bg-[#0D1A0D]" : "bg-[#1A0D0D]"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            allPassed ? "bg-green-400" : "bg-[#E63329]"
          }`}
        />
        <span
          className={`text-xs tracking-widest uppercase font-bold ${
            allPassed ? "text-green-400" : "text-[#E63329]"
          }`}
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {allPassed ? "All tests passed" : result.status === "error" ? "Runtime error" : "Tests failed"}
        </span>
      </div>

      {/* Requirement errors */}
      {result.requirementErrors.length > 0 && (
        <div className="px-5 py-3 border-b border-[#222222] bg-[#1A0E0A]">
          <p
            className="text-xs tracking-widest uppercase text-[#E87F3A] mb-2"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Requirements not met
          </p>
          {result.requirementErrors.map((err, i) => (
            <p
              key={i}
              className="text-xs text-[#E87F3A] pl-2 border-l border-[#E87F3A]"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Runtime error */}
      {result.error && (
        <div className="px-5 py-3 border-b border-[#222222]">
          <p
            className="text-xs tracking-widest uppercase text-[#E63329] mb-2"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Error
          </p>
          <pre
            className="text-xs text-[#E63329] whitespace-pre-wrap"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {result.error}
          </pre>
        </div>
      )}

      {/* Test cases */}
      {result.results.map((r, i) => (
        <div
          key={i}
          className={`px-5 py-3 border-b border-[#1A1A1A] ${
            r.passed ? "bg-transparent" : "bg-[#160A0A]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs text-[#555555] tracking-wider"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Test {i + 1}{r.description ? ` — ${r.description}` : ""}
            </span>
            <span
              className={`text-xs tracking-widest uppercase ${
                r.passed ? "text-green-400" : "text-[#E63329]"
              }`}
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {r.passed ? "pass" : "fail"}
            </span>
          </div>

          {!r.passed && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-4 text-xs" style={{ fontFamily: "var(--font-space-mono), monospace" }}>
                <span className="text-[#555555] w-16 shrink-0">input</span>
                <span className="text-[#AAAAAA]">{r.input}</span>
              </div>
              <div className="flex gap-4 text-xs" style={{ fontFamily: "var(--font-space-mono), monospace" }}>
                <span className="text-[#555555] w-16 shrink-0">expected</span>
                <span className="text-green-400">{r.expectedOutput}</span>
              </div>
              <div className="flex gap-4 text-xs" style={{ fontFamily: "var(--font-space-mono), monospace" }}>
                <span className="text-[#555555] w-16 shrink-0">got</span>
                <span className="text-[#E63329]">{r.actualOutput || r.error || "(empty)"}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* stdout */}
      {result.output && (
        <div className="px-5 py-3">
          <p
            className="text-xs tracking-widest uppercase text-[#555555] mb-2"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Output
          </p>
          <pre
            className="text-xs text-[#888888] whitespace-pre-wrap"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {result.output}
          </pre>
        </div>
      )}
    </div>
  );
}
