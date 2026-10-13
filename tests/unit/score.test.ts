import { describe, expect, it } from "vitest";
import { computeScore, gradeFor, scoreCeiling, type ScoreInput } from "@/lib/score";

const ALL = ["predict", "locate", "explain", "fix"] as const;
const perfect = (over: Partial<ScoreInput> = {}): ScoreInput => ({
  declared: ALL,
  done: { predict: true, locate: true, explain: true, fix: true },
  wrong: {},
  failedRuns: 0,
  hintsOpened: 0,
  solutionViewed: false,
  ...over,
});

describe("computeScore", () => {
  it("gives 100 and an S for a clean run of all four steps", () => {
    const s = computeScore(perfect());
    expect(s.total).toBe(100);
    expect(s.grade).toBe("S");
    expect(s.lines.map((l) => [l.step, l.earned, l.max])).toEqual([
      ["predict", 20, 20], ["locate", 20, 20], ["explain", 20, 20], ["fix", 40, 40],
    ]);
  });

  it("takes 5 from a step for each wrong answer in it, and only from that step", () => {
    const s = computeScore(perfect({ wrong: { predict: 2, explain: 1 } }));
    expect(s.lines.map((l) => l.earned)).toEqual([10, 20, 15, 40]);
    expect(s.lines[0]).toMatchObject({ lost: 10, mistakes: 2 });
    expect(s.total).toBe(85);
  });

  it("takes 3 from Fix for each run that did not pass", () => {
    expect(computeScore(perfect({ failedRuns: 4 })).lines[3].earned).toBe(28);
  });

  it("takes 5 from the total for each hint, not from a step", () => {
    const s = computeScore(perfect({ hintsOpened: 3 }));
    expect(s.hints).toEqual({ count: 3, lost: 15 });
    expect(s.lines.map((l) => l.earned)).toEqual([20, 20, 20, 40]);
    expect(s.total).toBe(85);
  });

  it("never pays less than 5 for a step that was completed", () => {
    const s = computeScore(perfect({ wrong: { locate: 50 }, failedRuns: 99 }));
    expect(s.lines[1].earned).toBe(5);
    expect(s.lines[3].earned).toBe(5);
  });

  it("pays 0 for a skipped step", () => {
    const s = computeScore(perfect({ done: { predict: true, fix: true } }));
    expect(s.lines.map((l) => [l.status, l.earned])).toEqual([
      ["done", 20], ["skipped", 0], ["skipped", 0], ["done", 40],
    ]);
    expect(s.total).toBe(60);
  });

  it("pays 0 for Fix when the solution was opened before solving it", () => {
    const s = computeScore(perfect({ solutionViewed: true }));
    expect(s.lines[3]).toMatchObject({ status: "solution", earned: 0, lost: 40 });
    expect(s.total).toBe(60);
  });

  it("does not punish a solution that was opened after Fix was solved", () => {
    // the store only sets solutionViewed before Fix is done, so the input says false
    expect(computeScore(perfect({ solutionViewed: false })).total).toBe(100);
  });

  it("never goes below 0 or above 100", () => {
    const worst = computeScore(perfect({ done: {}, hintsOpened: 10, wrong: { predict: 9 } }));
    expect(worst.total).toBe(0);
    expect(computeScore(perfect()).total).toBeLessThanOrEqual(100);
  });

  it("scales an exercise with fewer steps so a perfect run is still 100", () => {
    const s = computeScore({ ...perfect(), declared: ["predict", "explain"], done: { predict: true, explain: true } });
    expect(s.total).toBe(100);
    expect(s.lines.map((l) => l.max)).toEqual([50, 50]);
  });

  it("scales the penalties of a short exercise too", () => {
    const s = computeScore({ declared: ["predict", "explain"], done: { predict: true, explain: true }, wrong: { predict: 1 }, failedRuns: 0, hintsOpened: 0, solutionViewed: false });
    expect(s.lines[0].earned).toBe(38); // (20 - 5) * 2.5, rounded
    expect(s.total).toBe(88);
  });

  it("has a total that equals the lines minus the hints, so the receipt adds up", () => {
    const s = computeScore(perfect({ wrong: { locate: 1 }, failedRuns: 2, hintsOpened: 1 }));
    expect(s.lines.reduce((n, l) => n + l.earned, 0) - s.hints.lost).toBe(s.total);
  });

  it("is an empty score for an exercise with no steps", () => {
    expect(computeScore({ ...perfect(), declared: [], done: {} }).total).toBe(0);
  });

  it("is deterministic and does not change its input", () => {
    const input = perfect({ wrong: { predict: 1 } });
    const copy = JSON.stringify(input);
    expect(computeScore(input)).toEqual(computeScore(input));
    expect(JSON.stringify(input)).toBe(copy);
  });
});

describe("gradeFor", () => {
  it.each([
    [100, "S"], [95, "S"], [94, "A"], [80, "A"], [79, "B"], [60, "B"], [59, "C"], [0, "C"],
  ] as const)("%i is %s", (total, grade) => expect(gradeFor(total)).toBe(grade));
});

describe("scoreCeiling", () => {
  const fresh = (over: Partial<ScoreInput> = {}): ScoreInput => perfect({ done: {}, ...over });

  it("starts at 100 with nothing done and only goes down", () => {
    expect(scoreCeiling(fresh())).toBe(100);
    expect(scoreCeiling(fresh({ wrong: { predict: 1 } }))).toBe(95);
    expect(scoreCeiling(fresh({ wrong: { predict: 1 }, hintsOpened: 1 }))).toBe(90);
    expect(scoreCeiling(fresh({ wrong: { predict: 1 }, hintsOpened: 1, failedRuns: 2 }))).toBe(84);
  });

  it("drops by 40 when the solution is opened before solving", () => {
    expect(scoreCeiling(fresh({ solutionViewed: true }))).toBe(60);
  });

  it("equals the real total once every step is done", () => {
    const input = perfect({ wrong: { locate: 2 }, failedRuns: 1, hintsOpened: 1 });
    expect(scoreCeiling(input)).toBe(computeScore(input).total);
  });

  it("does not depend on which steps are done yet", () => {
    const input = fresh({ wrong: { explain: 1 } });
    expect(scoreCeiling({ ...input, done: { predict: true } })).toBe(scoreCeiling(input));
  });
});
