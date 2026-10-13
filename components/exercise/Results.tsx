import type { RunResult } from "@/lib/types";

/** A Python traceback, styled the way Python prints it. */
export function Traceback({ text }: { text: string }) {
  const lines = text.split("\n");
  const last = lines.length - 1;
  return (
    <div className="code" role="group" aria-label="Python error" tabIndex={0}>
      {lines.map((line, i) => {
        const isPointer = /^\s*[\^~]+\s*$/.test(line);
        const quiet = /^Traceback \(most recent/.test(line) || /^\s*File "/.test(line);
        const cls = ["l", isPointer ? "ptr" : "", i === last && !isPointer ? "err" : "", quiet ? "quiet" : ""]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={i} className={cls}>
            <span className="n" aria-hidden="true" />
            <span className="t">{line || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ResultsProps {
  result: RunResult | null;
  running: boolean;
  /** Seconds the run took, shown next to the summary. */
  seconds?: number;
}

/** Test results in the style of a pytest report: failures first, then passes. */
export default function Results({ result, running, seconds }: ResultsProps) {
  return (
    <div className="results" aria-live="polite">
      {running && <div className="sum idle">running…</div>}
      {!running && !result && <div className="sum idle">Run your code to see the results.</div>}
      {!running && result && <Report result={result} seconds={seconds} />}
    </div>
  );
}

function Report({ result, seconds }: { result: RunResult; seconds?: number }) {
  const passed = result.results.filter((r) => r.passed).length;
  const failed = result.results.length - passed;
  const time = seconds !== undefined ? `${seconds.toFixed(2)}s` : "";

  let summary: string;
  let tone: "ok" | "fail";
  if (result.status === "passed") {
    summary = `${passed} passed`;
    tone = "ok";
  } else if (result.requirementErrors.length > 0) {
    summary = "Not run: the code breaks a rule of this exercise";
    tone = "fail";
  } else if (result.timedOut) {
    summary = "Stopped";
    tone = "fail";
  } else if (result.unavailable) {
    summary = "Could not run";
    tone = "fail";
  } else if (result.results.length === 0) {
    summary = "Error";
    tone = "fail";
  } else {
    summary = `${failed} failed, ${passed} passed`;
    tone = "fail";
  }

  const ordered = [...result.results].sort((a, b) => Number(a.passed) - Number(b.passed));

  return (
    <>
      <div className={`sum ${tone}`}>
        <span>{summary}</span>
        {time && <span className="mono dim" style={{ marginLeft: "auto", fontWeight: 400 }}>{time}</span>}
      </div>

      {result.requirementErrors.length > 0 && (
        <div className="violations">
          <span className="label">Rules of this exercise</span>
          {result.requirementErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {result.error && (
        <div style={{ margin: "6px 0 14px" }}>
          {result.timedOut || result.unavailable ? (
            <p className="feedback" style={{ marginTop: 0 }}>{result.error}</p>
          ) : (
            <Traceback text={result.error} />
          )}
        </div>
      )}

      {ordered.map((r) =>
        r.passed ? (
          <div key={r.index} className="case pass">
            <span className="st p">passed</span>
            <span>test {r.index + 1}{r.description ? ` · ${r.description}` : ""}</span>
          </div>
        ) : (
          <div key={r.index} className="case">
            <span className="st f">FAILED</span>
            <span className="what">test {r.index + 1}{r.description ? ` · ${r.description}` : ""}</span>
            <div className="kv">
              <span>call</span>
              <span>{r.input}</span>
              <span>expected</span>
              <span className="exp">{r.expectedOutput}</span>
              <span>got</span>
              <span className="got">{r.error ? "raised an error" : r.actualOutput || "(empty)"}</span>
            </div>
            {r.error && (
              <div className="tb">
                <Traceback text={r.error} />
              </div>
            )}
          </div>
        )
      )}

      {result.output && (
        <div className="stdout">
          <span className="label">Printed output</span>
          <pre>{result.output}</pre>
        </div>
      )}
    </>
  );
}
