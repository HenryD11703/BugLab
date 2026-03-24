"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Difficulty } from "@/lib/types";

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: "#6BCB77",
  medium: "#E8B87F",
  hard: "#E63329",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type ExerciseItem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  testCount: number;
};

interface ExerciseGridProps {
  exercises: ExerciseItem[];
}

// Bento pattern: every 5th card (0, 5, 10…) is wide (col-span-2).
// In a 3-col grid: [col-2][col-1] / [col-1][col-1][col-1] — 2 rows per group.
function isWide(index: number) {
  return index % 5 === 0;
}

export default function ExerciseGrid({ exercises }: ExerciseGridProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("buglab:completed") ?? "[]";
      setCompleted(new Set(JSON.parse(raw)));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const filtered = useMemo(
    () =>
      difficulty === "all"
        ? exercises
        : exercises.filter((ex) => ex.difficulty === difficulty),
    [exercises, difficulty]
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex gap-1.5">
          <button
            onClick={() => setDifficulty("all")}
            className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors cursor-pointer ${
              difficulty === "all"
                ? "bg-[#0A0A0A] text-[#FAFAFA] border-[#0A0A0A]"
                : "bg-transparent text-[#6B6B6B] border-[#CCCCCC] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            All
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? "all" : d)}
              className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors cursor-pointer"
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                borderColor: difficulty === d ? DIFF_COLOR[d] : "#CCCCCC",
                backgroundColor: difficulty === d ? DIFF_COLOR[d] : "transparent",
                color: difficulty === d ? "#FAFAFA" : DIFF_COLOR[d],
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-[10px] tracking-[0.12em] uppercase text-[#CCCCCC]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
          </span>
          <Link
            href="/search"
            className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B] border border-[#CCCCCC] px-3 py-1.5 hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Search ↗
          </Link>
        </div>
      </div>

      {/* Bento grid */}
      {filtered.length === 0 ? (
        <div className="border border-[#E0E0E0] py-20 text-center">
          <p
            className="text-[#CCCCCC] text-sm tracking-widest uppercase"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            No exercises match
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#E8E8E8]">
          {filtered.map((ex, i) => {
            const wide = isWide(i);
            const color = DIFF_COLOR[ex.difficulty];

            return (
              <Link
                key={ex.id}
                href={`/exercise/${ex.id}`}
                className={`group flex flex-col bg-[#FAFAFA] hover:bg-white transition-colors p-5 min-h-40 border-t-2 ${
                  wide ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
                style={{ borderTopColor: color }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[9px] tracking-[0.2em] uppercase text-[#CCCCCC]"
                    style={{ fontFamily: "var(--font-space-mono), monospace" }}
                  >
                    {ex.id}
                  </span>
                  <span
                    className="text-[9px] tracking-[0.15em] uppercase font-bold"
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      color,
                    }}
                  >
                    {ex.difficulty}
                  </span>
                </div>

                {/* Title */}
                <h2
                  className={`font-bold tracking-tight text-[#0A0A0A] group-hover:text-[#E63329] transition-colors leading-tight mb-2 ${
                    wide ? "text-[1.3rem]" : "text-[1.05rem]"
                  }`}
                  style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                >
                  {ex.title}
                </h2>

                {/* Description — wide cards only */}
                {wide && (
                  <p
                    className="text-sm text-[#6B6B6B] leading-relaxed mb-3 flex-1 line-clamp-2"
                    style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                  >
                    {ex.description.replace(/\*\*/g, "").replace(/`/g, "")}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-end justify-between gap-2 mt-auto pt-3">
                  <div className="flex gap-1 flex-wrap">
                    {ex.tags.slice(0, wide ? 5 : 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] tracking-[0.08em] uppercase border border-[#EEEEEE] px-1.5 py-0.5 text-[#BBBBBB]"
                        style={{ fontFamily: "var(--font-space-mono), monospace" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {completed.has(ex.id) ? (
                    <span
                      className="text-[9px] tracking-widest uppercase font-bold shrink-0"
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        color: "#6BCB77",
                      }}
                    >
                      ✓ solved
                    </span>
                  ) : (
                    <span
                      className="text-[9px] tracking-widest text-[#CCCCCC] shrink-0 group-hover:text-[#AAAAAA] transition-colors"
                      style={{ fontFamily: "var(--font-space-mono), monospace" }}
                    >
                      {ex.testCount}t
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
