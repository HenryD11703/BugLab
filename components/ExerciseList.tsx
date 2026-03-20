"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ExerciseMeta, Difficulty } from "@/lib/types";

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "#6BCB77",
  medium: "#E8B87F",
  hard: "#E63329",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface ExerciseListProps {
  exercises: (ExerciseMeta & { description: string; testCount: number })[];
}

export default function ExerciseList({ exercises }: ExerciseListProps) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return exercises.filter((ex) => {
      const matchesDifficulty = difficulty === "all" || ex.difficulty === difficulty;
      const matchesSearch =
        !q ||
        ex.title.toLowerCase().includes(q) ||
        ex.tags.some((t) => t.toLowerCase().includes(q)) ||
        ex.description.toLowerCase().includes(q);
      return matchesDifficulty && matchesSearch;
    });
  }, [exercises, search, difficulty]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[180px] relative">
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[#CCCCCC] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#0A0A0A] transition-colors"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          />
        </div>

        {/* Difficulty pills */}
        <div className="flex gap-1">
          <button
            onClick={() => setDifficulty("all")}
            className={`px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase transition-colors cursor-pointer border ${
              difficulty === "all"
                ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                : "bg-white text-[#6B6B6B] border-[#CCCCCC] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            All
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? "all" : d)}
              className={`px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase transition-colors cursor-pointer border ${
                difficulty === d
                  ? "text-white border-transparent"
                  : "bg-white border-[#CCCCCC] hover:border-[#0A0A0A]"
              }`}
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                backgroundColor: difficulty === d ? DIFFICULTY_COLOR[d] : undefined,
                color: difficulty === d ? "white" : DIFFICULTY_COLOR[d],
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Count */}
        <span
          className="text-[10px] tracking-[0.12em] uppercase text-[#AAAAAA] shrink-0"
          style={{ fontFamily: "var(--font-space-mono), monospace" }}
        >
          {filtered.length} / {exercises.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-[#E0E0E0] py-16 text-center">
          <p
            className="text-[#CCCCCC] text-sm tracking-widest uppercase"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            No exercises match
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-center justify-between px-6 pb-3 border-b-2 border-[#0A0A0A]">
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-[#0A0A0A] font-bold"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Exercise
            </span>
            <span
              className="text-[10px] tracking-[0.15em] uppercase text-[#0A0A0A] font-bold"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Difficulty
            </span>
          </div>

          <div className="border border-t-0 border-[#E0E0E0]">
            {filtered.map((ex) => (
              <Link
                key={ex.id}
                href={`/exercise/${ex.id}`}
                className="group block border-b border-[#E0E0E0] hover:bg-[#F5F5F5] transition-colors last:border-b-0"
              >
                <div className="px-6 py-4 flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span
                        className="text-[10px] tracking-[0.12em] uppercase text-[#BBBBBB]"
                        style={{ fontFamily: "var(--font-space-mono), monospace" }}
                      >
                        {ex.id}
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {ex.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] tracking-[0.1em] uppercase text-[#999999] border border-[#EEEEEE] px-1.5 py-0.5"
                            style={{ fontFamily: "var(--font-space-mono), monospace" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h2
                      className="text-base font-semibold text-[#0A0A0A] tracking-[-0.01em] group-hover:text-[#E63329] transition-colors leading-tight"
                      style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                    >
                      {ex.title}
                    </h2>
                    <p
                      className="text-sm text-[#6B6B6B] mt-0.5 leading-relaxed line-clamp-1"
                      style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                    >
                      {ex.description.slice(0, 110).replace(/\*\*/g, "")}...
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className="text-[10px] tracking-[0.15em] uppercase font-bold"
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        color: DIFFICULTY_COLOR[ex.difficulty],
                      }}
                    >
                      {ex.difficulty}
                    </span>
                    <span
                      className="text-[10px] tracking-[0.1em] uppercase text-[#CCCCCC] group-hover:text-[#E63329] transition-colors"
                      style={{ fontFamily: "var(--font-space-mono), monospace" }}
                    >
                      {ex.testCount} test{ex.testCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
