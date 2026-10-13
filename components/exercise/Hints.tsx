"use client";

import { useState } from "react";
import { canShowSolution } from "@/lib/steps";
import { InlineMarkdown } from "../Markdown";
import CodeBlock from "../CodeBlock";

interface HintsProps {
  exerciseId: string;
  hints: string[];
  /** How many hints are open; hints open one at a time, in order. */
  opened: number;
  onOpen: (count: number) => void;
  solved: boolean;
}

export default function Hints({ exerciseId, hints, opened, onOpen, solved }: HintsProps) {
  const unlocked = canShowSolution(opened, hints.length, solved);
  const [solution, setSolution] = useState<{ code: string } | { error: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function showSolution() {
    setLoading(true);
    try {
      const res = await fetch(`/solutions/${exerciseId}.json`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string };
      setSolution({ code: data.code });
    } catch {
      setSolution({ error: "Could not load the solution. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  const left = hints.length - opened;

  return (
    <>
      <div className="hints">
        {hints.map((hint, i) => {
          const isOpen = i < opened;
          const isNext = i === opened;
          return (
            <div key={i} className={`hint ${isOpen ? "open" : ""} ${!isOpen && !isNext ? "locked" : ""}`}>
              {isOpen ? (
                <>
                  <div className="head">
                    <span>hint {i + 1}</span>
                    <span className="state">opened</span>
                  </div>
                  <div className="body">
                    <p><InlineMarkdown text={hint} /></p>
                  </div>
                </>
              ) : isNext ? (
                <button type="button" onClick={() => onOpen(i + 1)}>
                  <span>hint {i + 1}</span>
                  <span className="state">open ▸</span>
                </button>
              ) : (
                <div className="head">
                  <span>hint {i + 1}</span>
                  <span className="state">after hint {i}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="solution">
        <div className="head">
          <span>solution</span>
          {unlocked ? (
            solution && "code" in solution ? (
              <span>shown below</span>
            ) : (
              <button type="button" onClick={showSolution} disabled={loading}>
                {loading ? "loading…" : "show solution"}
              </button>
            )
          ) : (
            <button type="button" disabled>
              opens after {left === 1 ? "the last hint" : `${left} more hints`}
            </button>
          )}
        </div>
        {solution && "error" in solution && <p className="feedback">{solution.error}</p>}
        {solution && "code" in solution && <CodeBlock code={solution.code} label="Reference solution" />}
      </div>
    </>
  );
}
