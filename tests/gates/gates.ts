import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { checkConstraints } from "@/lib/analysis";
import { exerciseSchema } from "@/lib/schema";

const HARNESS = path.join(__dirname, "harness.py");

export function pythonCommand(): string {
  if (process.env.PYTHON) return process.env.PYTHON;
  return process.platform === "win32" ? "python" : "python3";
}

interface HarnessResponse {
  python: string;
  variants: Record<string, { loadError: string } | { results: boolean[] }>;
  predict: { output: string } | null;
}

function runHarness(request: unknown): HarnessResponse {
  const res = spawnSync(pythonCommand(), ["-I", HARNESS], {
    input: JSON.stringify(request),
    encoding: "utf-8",
    timeout: 20_000,
  });
  if (res.error) throw new Error(`could not run Python (${pythonCommand()}): ${res.error.message}`);
  if (res.status !== 0) throw new Error(`harness failed: ${res.stderr}`);
  return JSON.parse(res.stdout) as HarnessResponse;
}

export function pythonVersion(): string {
  return runHarness({ variants: {}, tests: [] }).python;
}

const read = (p: string) => fs.readFileSync(p, "utf-8");

/**
 * Checks one exercise folder against real Python and returns a list of
 * problems (empty means the exercise passes every gate).
 */
export function checkExercise(dir: string): string[] {
  const problems: string[] = [];
  const need = (file: string) => fs.existsSync(path.join(dir, file));

  for (const f of ["exercise.json", "buggy.py", "solution.py"]) {
    if (!need(f)) problems.push(`missing ${f}`);
  }
  if (problems.length) return problems;

  let raw: unknown;
  try {
    raw = JSON.parse(read(path.join(dir, "exercise.json")));
  } catch (e) {
    return [`exercise.json is not valid JSON: ${String(e)}`];
  }
  const parsed = exerciseSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `schema: ${i.path.join(".")}: ${i.message}`);
  }
  const ex = parsed.data;
  const buggy = read(path.join(dir, "buggy.py"));
  const solution = read(path.join(dir, "solution.py"));

  // the reference solution must obey the exercise's own constraints
  if (ex.fix?.constraints) {
    const analysis = checkConstraints(solution, ex.fix.constraints);
    if (analysis.syntaxError) problems.push("solution.py has a syntax error");
    for (const v of analysis.violations) {
      problems.push(`solution.py breaks a constraint: ${v.message}`);
    }
  }

  // locate: lines must exist and point at real code
  const lines = buggy.replace(/\n$/, "").split("\n");
  for (const bug of ex.locate?.bugs ?? []) {
    for (const n of bug.lines) {
      const text = lines[n - 1]?.trim();
      if (text === undefined) problems.push(`locate: line ${n} is past the end of buggy.py`);
      else if (text === "" || text.startsWith("#")) problems.push(`locate: line ${n} is blank or a comment`);
    }
  }

  const wrongDir = path.join(dir, "wrong-fixes");
  const wrong: Record<string, string> = {};
  if (fs.existsSync(wrongDir)) {
    for (const f of fs.readdirSync(wrongDir).filter((f) => f.endsWith(".py")).sort()) {
      wrong[`wrong:${f}`] = read(path.join(wrongDir, f));
    }
  }
  if (ex.fix && Object.keys(wrong).length === 0) {
    problems.push("wrong-fixes/ needs at least one plausible wrong fix");
  }

  const res = runHarness({
    setup: ex.fix?.setup ?? null,
    tests: ex.fix?.tests ?? [],
    variants: { buggy, solution, ...wrong },
    predict: ex.predict ? { code: ex.predict.code } : null,
    predictBase: "buggy",
  });

  if (ex.fix) {
    const outcome = (name: string) => res.variants[name];
    const b = outcome("buggy");
    if ("loadError" in b) problems.push(`buggy.py does not load: ${b.loadError}`);
    else if (b.results.every(Boolean)) problems.push("buggy.py passes every test (the exercise teaches nothing)");

    const s = outcome("solution");
    if ("loadError" in s) problems.push(`solution.py does not load: ${s.loadError}`);
    else if (!s.results.every(Boolean)) {
      const failing = s.results.flatMap((ok, i) => (ok ? [] : [i + 1]));
      problems.push(`solution.py fails test(s) ${failing.join(", ")}`);
    }

    for (const name of Object.keys(wrong)) {
      const w = outcome(name);
      if ("results" in w && w.results.every(Boolean)) {
        problems.push(`${name.replace("wrong:", "wrong-fixes/")} passes every test, so tests miss that mistake`);
      }
    }
  }

  if (ex.predict && res.predict) {
    if (res.predict.output !== ex.predict.answer.trim()) {
      problems.push(`predict: answer "${ex.predict.answer}" but CPython gives "${res.predict.output}"`);
    }
  }

  return problems;
}
