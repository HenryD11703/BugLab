import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * The CPython gates in tests/gates run on whatever Python the machine has.
 * This runs the same checks inside the real Pyodide (CPython 3.12) that
 * learners get, through the production worker script.
 */
const EXERCISES = path.join(process.cwd(), "exercises");

interface Variant {
  exercise: string;
  name: string;
  code: string;
}
interface Meta {
  setup: string | null;
  tests: { input: string; expected: string }[];
  predict: { code: string; answer: string } | null;
}

function collect() {
  const variants: Variant[] = [];
  const meta: Record<string, Meta> = {};
  for (const id of fs.readdirSync(EXERCISES).sort()) {
    const dir = path.join(EXERCISES, id);
    if (!fs.statSync(dir).isDirectory()) continue;
    const ex = JSON.parse(fs.readFileSync(path.join(dir, "exercise.json"), "utf-8"));
    if (!ex.fix) continue;
    meta[id] = { setup: ex.fix.setup ?? null, tests: ex.fix.tests, predict: ex.predict ?? null };
    variants.push({ exercise: id, name: "buggy", code: fs.readFileSync(path.join(dir, "buggy.py"), "utf-8") });
    variants.push({ exercise: id, name: "solution", code: fs.readFileSync(path.join(dir, "solution.py"), "utf-8") });
    const wf = path.join(dir, "wrong-fixes");
    if (fs.existsSync(wf)) {
      for (const f of fs.readdirSync(wf).sort()) {
        variants.push({ exercise: id, name: `wrong:${f}`, code: fs.readFileSync(path.join(wf, f), "utf-8") });
      }
    }
  }
  return { variants, meta };
}

test("every exercise behaves as declared in the real Pyodide runtime", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "same worker, the desktop run is enough");
  test.setTimeout(180_000);
  const { variants, meta } = collect();

  await page.goto("/");
  const outcomes = await page.evaluate(
    async ({ variants, meta }) => {
      const worker = new Worker("/python-worker.js");
      await new Promise<string>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.type === "ready") resolve(e.data.python);
          else if (e.data.type === "init-error") reject(e.data.message);
        };
        worker.postMessage({ type: "init" });
      });

      let id = 0;
      const send = (payload: unknown) =>
        new Promise<{ load: { traceback: string } | null; tests: { passed: boolean; actual: string }[] }>((resolve) => {
          const myId = ++id;
          const onMsg = (e: MessageEvent) => {
            if (e.data.type === "result" && e.data.id === myId) {
              worker.removeEventListener("message", onMsg);
              resolve(e.data.result);
            }
          };
          worker.addEventListener("message", onMsg);
          worker.postMessage({ type: "run", id: myId, payload });
        });

      const out: Record<string, { passed: boolean[]; loadError: string | null }> = {};
      for (const v of variants) {
        const m = meta[v.exercise];
        const result = await send({ code: v.code, setup: m.setup, tests: m.tests });
        out[`${v.exercise}/${v.name}`] = {
          passed: result.tests.map((t) => t.passed),
          loadError: result.load?.traceback ?? null,
        };
      }

      // predict: run the leading statements after the buggy code, test the last expression.
      // Answers that are an exception name are covered by the CPython gate only.
      for (const [exId, m] of Object.entries(meta)) {
        if (!m.predict || /^[A-Za-z]+Error$/.test(m.predict.answer)) continue;
        const buggy = variants.find((v) => v.exercise === exId && v.name === "buggy")!;
        const lines = m.predict.code.split("\n");
        const last = lines.pop()!;
        const code = buggy.code + "\n" + lines.join("\n") + "\n";
        const result = await send({ code, setup: m.setup, tests: [{ input: last, expected: m.predict.answer }] });
        out[`${exId}/predict`] = { passed: [result.tests[0].actual === m.predict.answer], loadError: null };
      }

      worker.terminate();
      return out;
    },
    { variants, meta }
  );

  const problems: string[] = [];
  for (const [key, o] of Object.entries(outcomes)) {
    const name = key.split("/")[1];
    if (o.loadError && name !== "buggy") problems.push(`${key}: does not load: ${o.loadError.split("\n").pop()}`);
    if (name === "solution" && !(o.passed.length > 0 && o.passed.every(Boolean))) problems.push(`${key}: solution does not pass all tests`);
    if (name === "buggy" && o.passed.every(Boolean)) problems.push(`${key}: buggy code passes every test`);
    if (name.startsWith("wrong:") && o.passed.every(Boolean)) problems.push(`${key}: wrong fix passes every test`);
    if (name === "predict" && !o.passed[0]) problems.push(`${key}: predict answer differs from Pyodide's output`);
  }
  expect(problems).toEqual([]);
  expect(Object.keys(outcomes).length).toBeGreaterThan(80);
});
