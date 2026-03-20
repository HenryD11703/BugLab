"use client";

import { useState } from "react";

interface HintsPanelProps {
  hints: string[];
}

export default function HintsPanel({ hints }: HintsPanelProps) {
  const [revealed, setRevealed] = useState<number[]>([]);

  if (!hints || hints.length === 0) return null;

  const revealNext = () => {
    const next = revealed.length;
    if (next < hints.length) {
      setRevealed((prev) => [...prev, next]);
    }
  };

  return (
    <div className="border-t border-[#E0E0E0]">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Hints
          </span>
          <span
            className="text-[10px] text-[#6B6B6B]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {revealed.length}/{hints.length}
          </span>
        </div>
        {revealed.length < hints.length && (
          <button
            onClick={revealNext}
            className="text-[10px] tracking-[0.12em] uppercase text-[#E63329] hover:opacity-70 transition-opacity cursor-pointer"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            {revealed.length === 0 ? "Show first hint" : "Next hint →"}
          </button>
        )}
      </div>

      {/* Hints */}
      {revealed.length > 0 && (
        <div className="px-6 pb-4 space-y-3">
          {revealed.map((idx) => (
            <div key={idx} className="flex gap-3">
              <span
                className="text-[10px] text-[#E63329] shrink-0 mt-0.5"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <p className="text-sm text-[#3A3A3A] leading-relaxed">{hints[idx]}</p>
            </div>
          ))}
        </div>
      )}

      {revealed.length === 0 && (
        <div className="px-6 pb-4">
          <div className="h-8 flex items-center">
            <div className="h-px flex-1 bg-[#E0E0E0]" />
            <span
              className="mx-3 text-[10px] text-[#CCCCCC] tracking-widest uppercase"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              locked
            </span>
            <div className="h-px flex-1 bg-[#E0E0E0]" />
          </div>
        </div>
      )}
    </div>
  );
}
