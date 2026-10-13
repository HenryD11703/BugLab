import { highlightLines } from "@/lib/highlight";

interface CodeBlockProps {
  code: string;
  /** Accessible name of the block. */
  label: string;
  /** 1-indexed lines the learner has marked (Locate). */
  marked?: number[];
  /** 1-indexed lines to flag as the bug (after Locate is solved). */
  bug?: number[];
  /**
   * Draw a ^^^^ pointer under a line, like a traceback does. A number points at
   * the whole statement; an object points at columns [from, to) of the line.
   */
  pointAt?: (number | { line: number; from: number; to: number })[];
  /** When set, every line is a button that toggles itself. */
  onToggleLine?: (line: number) => void;
}

/** Read-only Python with line numbers. Works on the server and in the browser. */
export default function CodeBlock({ code, label, marked = [], bug = [], pointAt = [], onToggleLine }: CodeBlockProps) {
  const lines = highlightLines(code);
  const pickable = Boolean(onToggleLine);

  return (
    <div className="code" aria-label={label} role="group" tabIndex={pickable ? undefined : 0}>
      {lines.map((tokens, i) => {
        const n = i + 1;
        const text = tokens.map((t) => t.text).join("");
        const cls = ["l", marked.includes(n) ? "marked" : "", bug.includes(n) ? "bug" : ""].filter(Boolean).join(" ");
        const body = (
          <>
            <span className="n" aria-hidden="true">{n}</span>
            <span className="t">
              {tokens.length === 0 ? " " : tokens.map((t, j) => (t.cls ? <span key={j} className={t.cls}>{t.text}</span> : t.text))}
            </span>
          </>
        );
        const indent = text.length - text.trimStart().length;
        const spec = pointAt.find((p) => (typeof p === "number" ? p : p.line) === n);
        const pointer =
          spec === undefined
            ? null
            : typeof spec === "number"
              ? " ".repeat(indent) + "^".repeat(Math.max(text.trim().length, 1))
              : " ".repeat(spec.from) + "^".repeat(Math.max(spec.to - spec.from, 1));
        return (
          <span key={n} style={{ display: "contents" }}>
            {pickable ? (
              <button
                type="button"
                className={cls}
                aria-pressed={marked.includes(n)}
                aria-label={`Line ${n}: ${text.trim() || "empty"}`}
                onClick={() => onToggleLine?.(n)}
              >
                {body}
              </button>
            ) : (
              <div className={cls}>{body}</div>
            )}
            {pointer !== null && (
              <div className="l ptr" aria-hidden="true">
                <span className="n" />
                <span className="t">{pointer}</span>
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
