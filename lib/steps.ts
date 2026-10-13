/**
 * Grading for the reading steps. Everything here is deterministic: an exact
 * comparison with data stored in the exercise (principle 1). Only the Fix
 * step runs code.
 */

export interface BugGroup {
  lines: number[];
}

/** Whitespace and quote style do not matter when comparing a typed answer. */
function normalise(s: string): string {
  return s.trim().replace(/\s+/g, "").replace(/"/g, "'");
}

/**
 * Compares what the learner typed with the stored output. Error names
 * ("TypeError") ignore case; every other answer must match as written.
 */
export function checkPredict(typed: string, answer: string): boolean {
  const a = normalise(typed);
  const b = normalise(answer);
  if (!a) return false;
  if (/^[A-Za-z]+Error$/.test(answer.trim())) return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

export type LocateVerdict =
  | { status: "empty" }
  | { status: "correct" }
  /** Some bugs found, some missing (exercises with several bugs). */
  | { status: "partial"; found: number; total: number }
  | { status: "wrong" };

/**
 * `selected` are the 1-indexed lines the learner marked. They are right when
 * every bug group is hit by at least one marked line and no marked line lies
 * outside all groups.
 */
export function checkLocate(selected: number[], bugs: BugGroup[]): LocateVerdict {
  if (selected.length === 0) return { status: "empty" };
  const inAnyGroup = (n: number) => bugs.some((b) => b.lines.includes(n));
  const stray = selected.some((n) => !inAnyGroup(n));
  const found = bugs.filter((b) => b.lines.some((n) => selected.includes(n))).length;
  if (!stray && found === bugs.length) return { status: "correct" };
  if (!stray && found > 0) return { status: "partial", found, total: bugs.length };
  return { status: "wrong" };
}

export function checkExplain(choice: number | null, correct: number): boolean {
  return choice !== null && choice === correct;
}

/** "Show solution" opens once every hint has been opened, or the exercise is solved. */
export function canShowSolution(hintsOpened: number, totalHints: number, solved: boolean): boolean {
  return solved || hintsOpened >= totalHints;
}
