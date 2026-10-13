"use client";

import { useState } from "react";

interface RepeatControlProps {
  /** There is progress that repeating would erase, so ask first. */
  needsConfirm: boolean;
  onRepeat: () => void;
  /** "bar" is a small text button for the top bar; "panel" is a full button. */
  variant: "bar" | "panel";
  /** Mentioned in the confirmation so the learner knows what is kept. */
  best?: number;
}

/** Starts an exercise over. Asks once, inline, when there is something to lose. */
export default function RepeatControl({ needsConfirm, onRepeat, variant, best }: RepeatControlProps) {
  const [asking, setAsking] = useState(false);
  const buttonClass = variant === "bar" ? "linkbtn" : "btn ghost";

  if (asking) {
    return (
      <span className="confirm" role="group" aria-label="Confirm repeating this exercise">
        <span className="confirm-text">
          Start over?{best !== undefined && best > 0 ? ` Your best (${best}) is kept.` : ""}
        </span>
        <button
          type="button"
          className={variant === "bar" ? "linkbtn strong" : "btn small"}
          onClick={() => {
            setAsking(false);
            onRepeat();
          }}
        >
          Yes, repeat
        </button>
        <button type="button" className={variant === "bar" ? "linkbtn" : "btn ghost small"} autoFocus onClick={() => setAsking(false)}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={() => (needsConfirm ? setAsking(true) : onRepeat())}
    >
      {variant === "bar" ? "↺ repeat" : "Repeat ↺"}
    </button>
  );
}
