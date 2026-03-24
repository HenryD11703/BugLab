"use client";

import { useState, useMemo } from "react";
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

interface SearchClientProps {
  exercises: ExerciseItem[];
}

export default function SearchClient({ exercises }: SearchClientProps) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // All unique tags across all exercises
  const allTags = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((ex) => ex.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [exercises]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return exercises.filter((ex) => {
      if (difficulty !== "all" && ex.difficulty !== difficulty) return false;
      if (selectedTags.size > 0 && !ex.tags.some((t) => selectedTags.has(t)))
        return false;
      if (!q) return true;
      return (
        ex.title.toLowerCase().includes(q) ||
        ex.tags.some((t) => t.toLowerCase().includes(q)) ||
        ex.description.toLowerCase().includes(q)
      );
    });
  }, [exercises, query, difficulty, selectedTags]);

  const hasFilters =
    query.trim() !== "" || difficulty !== "all" || selectedTags.size > 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Nav */}
      <div className="border-b border-[#0A0A0A]">
        <div className="max-w-4xl mx-auto px-8">
          <nav className="flex items-center justify-between h-12">
            <Link
              href="/"
              className="text-[10px] tracking-[0.2em] uppercase text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              ← BugLab
            </Link>
            <span
              className="text-[10px] tracking-[0.2em] uppercase text-[#0A0A0A] font-bold"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Search
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Search input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by title, concept, tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full border-b-2 border-[#0A0A0A] bg-transparent px-0 py-3 text-2xl font-bold text-[#0A0A0A] placeholder-[#CCCCCC] focus:outline-none tracking-tight"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          />
        </div>

        {/* Difficulty filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className="text-[9px] tracking-[0.2em] uppercase text-[#AAAAAA] mr-1"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Difficulty
          </span>
          <button
            onClick={() => setDifficulty("all")}
            className={`px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase border transition-colors cursor-pointer ${
              difficulty === "all"
                ? "bg-[#0A0A0A] text-[#FAFAFA] border-[#0A0A0A]"
                : "bg-transparent text-[#6B6B6B] border-[#DDDDDD] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            All
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? "all" : d)}
              className="px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase border transition-colors cursor-pointer"
              style={{
                fontFamily: "var(--font-space-mono), monospace",
                borderColor: difficulty === d ? DIFF_COLOR[d] : "#DDDDDD",
                backgroundColor: difficulty === d ? DIFF_COLOR[d] : "transparent",
                color: difficulty === d ? "#FAFAFA" : DIFF_COLOR[d],
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Tag cloud */}
        <div className="flex items-start gap-2 mb-8 flex-wrap">
          <span
            className="text-[9px] tracking-[0.2em] uppercase text-[#AAAAAA] mr-1 mt-1.5"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Tags
          </span>
          {allTags.map((tag) => {
            const active = selectedTags.has(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-2 py-1 text-[8px] tracking-[0.08em] uppercase border transition-colors cursor-pointer"
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  borderColor: active ? "#0A0A0A" : "#E0E0E0",
                  backgroundColor: active ? "#0A0A0A" : "transparent",
                  color: active ? "#FAFAFA" : "#999999",
                }}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.size > 0 && (
            <button
              onClick={() => setSelectedTags(new Set())}
              className="px-2 py-1 text-[8px] tracking-[0.08em] uppercase text-[#E63329] border border-transparent hover:border-[#E63329] transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              clear ✕
            </button>
          )}
        </div>

        {/* Results count + clear */}
        <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-4 mb-6">
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#AAAAAA]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {filtered.length} / {exercises.length} exercises
          </span>
          {hasFilters && (
            <button
              onClick={() => {
                setQuery("");
                setDifficulty("all");
                setSelectedTags(new Set());
              }}
              className="text-[9px] tracking-[0.12em] uppercase text-[#CCCCCC] hover:text-[#E63329] transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              Reset all
            </button>
          )}
        </div>

        {/* Results list */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center border border-[#E0E0E0]">
            <p
              className="text-[#CCCCCC] text-sm tracking-widest uppercase"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              No exercises match
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-[#E8E8E8]">
            {filtered.map((ex) => {
              const color = DIFF_COLOR[ex.difficulty];
              return (
                <Link
                  key={ex.id}
                  href={`/exercise/${ex.id}`}
                  className="group flex items-start gap-6 bg-[#FAFAFA] hover:bg-white transition-colors px-6 py-5 border-l-2"
                  style={{ borderLeftColor: color }}
                >
                  {/* Left: id + difficulty */}
                  <div className="shrink-0 pt-0.5 w-24">
                    <div
                      className="text-[9px] tracking-[0.2em] uppercase text-[#CCCCCC] mb-1"
                      style={{ fontFamily: "var(--font-space-mono), monospace" }}
                    >
                      {ex.id}
                    </div>
                    <div
                      className="text-[9px] tracking-[0.15em] uppercase font-bold"
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        color,
                      }}
                    >
                      {ex.difficulty}
                    </div>
                  </div>

                  {/* Right: content */}
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-base font-bold tracking-tight text-[#0A0A0A] group-hover:text-[#E63329] transition-colors leading-tight mb-1.5"
                      style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                    >
                      {ex.title}
                    </h2>
                    <p
                      className="text-sm text-[#6B6B6B] leading-relaxed mb-2 line-clamp-2"
                      style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                    >
                      {ex.description.replace(/\*\*/g, "").replace(/`/g, "")}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ex.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[8px] tracking-[0.08em] uppercase border border-[#EEEEEE] px-1.5 py-0.5 text-[#BBBBBB]"
                          style={{ fontFamily: "var(--font-space-mono), monospace" }}
                        >
                          {tag}
                        </span>
                      ))}
                      <span
                        className="text-[9px] tracking-widest uppercase text-[#DDDDDD] ml-auto"
                        style={{ fontFamily: "var(--font-space-mono), monospace" }}
                      >
                        {ex.testCount} test{ex.testCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
