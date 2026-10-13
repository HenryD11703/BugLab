import type { Score, ScoreLine } from "@/lib/score";

const LABEL: Record<ScoreLine["step"], string> = { predict: "predict", locate: "locate", explain: "explain", fix: "fix" };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function detail(line: ScoreLine): string {
  if (line.status === "skipped") return "skipped";
  if (line.status === "solution") return "opened the solution first";
  if (line.mistakes === 0) return "";
  const what = line.step === "fix" ? plural(line.mistakes, "failed run", "failed runs") : plural(line.mistakes, "wrong answer", "wrong answers");
  return line.lost > 0 ? `${what}, -${line.lost}` : what;
}

interface ScoreReceiptProps {
  score: Score;
  /** Best score over all attempts, including this one. */
  best: number;
}

/**
 * The result of an exercise as a receipt in the style of a pytest report:
 * every line that adds or takes points, then the total and the grade.
 */
export default function ScoreReceipt({ score, best }: ScoreReceiptProps) {
  const isBest = score.total >= best;
  return (
    <section className="receipt" aria-labelledby="receipt-title">
      <div className="receipt-head">
        <span className="label" id="receipt-title">Score</span>
        <span className="mono dim receipt-best">{isBest ? "new best" : `best ${best}`}</span>
      </div>

      <ul className="receipt-lines">
        {score.lines.map((l, i) => (
          <li key={l.step} style={{ ["--i" as string]: i }}>
            <span className={`amt ${l.status === "done" && l.lost === 0 ? "full" : l.earned > 0 ? "part" : "none"}`}>+{l.earned}</span>
            <span className="what">{LABEL[l.step]}</span>
            <span className="why">{detail(l)}</span>
          </li>
        ))}
        {score.hints.count > 0 && (
          <li style={{ ["--i" as string]: score.lines.length }}>
            <span className="amt neg">-{score.hints.lost}</span>
            <span className="what">hints</span>
            <span className="why">{plural(score.hints.count, "hint opened", "hints opened")}</span>
          </li>
        )}
      </ul>

      <div className="receipt-total" style={{ ["--i" as string]: score.lines.length + 1 }}>
        <span className="num">{score.total}</span>
        <span className="of">
          <span aria-hidden="true">/ 100</span>
          <span className="sr-only"> out of 100 points</span>
        </span>
        <span className={`grade g-${score.grade}`}>
          <span className="sr-only">Grade </span>
          {score.grade}
          <span className="caret" aria-hidden="true">^^^</span>
        </span>
      </div>

      {score.total < 100 && <p className="receipt-tip">Repeat the exercise to improve it. Your best score is kept.</p>}
    </section>
  );
}
