# Architecture

How BugLab is built, and why. The rules are in [`00-principles.md`](00-principles.md); what the product does and the acceptance criteria are in [`01-spec.md`](01-spec.md); the original plan, with the alternatives we weighed, is [`02-plan.md`](02-plan.md). This page describes the code as it is.

## The shape of it

```
exercises/<id>/            content, plain files            (source of truth)
   │  validated by lib/schema.ts when the site is built
   ▼
app/page.tsx               home, generated at build time
app/exercise/[id]/page.tsx one page per exercise, generated at build time
   │  props: the validated exercise (no solution, no wrong fixes)
   ▼
components/exercise/ExerciseView.tsx      (browser)
   ├─ Steps.tsx   Predict, Locate, Explain   graded by lib/steps.ts, no code runs
   └─ FixStep.tsx Fix
        ├─ lib/analysis.ts      rules checked by parsing (@lezer/python)
        └─ lib/runner.ts ──► public/python-worker.js ──► Pyodide (CDN)
```

There is no server code at run time. Every page is static HTML plus JavaScript; there are no API routes and no server actions.

## Decisions

### Exercises are folders, validated at build time
`lib/schema.ts` (zod) describes `exercise.json` strictly: unknown fields are errors, so a typo cannot pass silently. `lib/exercises.ts` loads and validates every exercise while the site is built, so a broken exercise fails the build with the file and the reason. The loader never returns `solution.py` or the wrong fixes, so neither reaches the page payload.

*Alternative rejected:* a registry in code. It would make adding an exercise a code change.

### Grading is data, not opinion
Predict, Locate and Explain are exact comparisons with data stored in the exercise (`lib/steps.ts`). Fix runs code, but only the *results* of tests decide. Nothing is graded by a model, and nothing needs a server.

### Rules are checked by parsing, not by running
`lib/analysis.ts` walks the Lezer syntax tree for banned calls and imports, required keywords, loops and recursion, and reports the line. It is plain TypeScript, so it runs in Node under unit test and in the browser without loading Python.

*Alternative rejected:* the previous version checked rules with Python's `ast` module inside Pyodide, which forced loading ~10 MB just to read code.

### Python runs in a Web Worker, and a stuck run is killed
`public/python-worker.js` loads Pyodide (pinned, CPython 3.12) and runs each request in a **new namespace**, so a function defined by an earlier run can never make a later run pass. Output is capped at 10,000 characters, and errors come back as Python-style tracebacks limited to the learner's own code (`solution.py`).

`lib/runner.ts` owns the worker. It loads the runtime when a component that runs code mounts (so the home page and the reading steps never download it), and gives each run 5 seconds. When the time is up it **terminates the worker** and starts a new one in the background.

*Alternatives rejected:* running on the main thread (an infinite loop froze the tab for good); Pyodide's interrupt buffer (it needs `SharedArrayBuffer`, which needs response headers that static hosts often cannot set); running Python on a server (it would break principle 2).

The worker is a plain script in `public/`, not a bundled module, so it has no build-tool surprises. The protocol is documented at the top of the file.

### Progress is a small immutable model behind `useSyncExternalStore`
`lib/progress-model.ts` has no browser APIs: it parses and migrates stored data (including the old solved-ids key), tolerates corrupt values, and applies actions without mutating. `lib/progress.ts` stores it in `localStorage` and exposes hooks. Storage failures (blocked, full) are swallowed: progress is a convenience and must never break the page.

### The score is a pure function
`lib/score.ts` turns what the learner did (steps done, wrong answers, failed runs, hints, whether the solution was opened first) into the receipt lines, the total and the grade. Nothing about it depends on React or the browser, so every rule is a unit test. `scoreCeiling` is the same function with every pending step assumed done: it starts at 100 and only goes down, which is what the live indicator in the top bar shows, so a mistake is visible the moment it costs points.

The counters live in the progress model (`wrong`, `failedRuns`, `solutionViewed`, `hintsAtSolve`, `best`) and are guarded: a wrong answer in a step that is already done, a failed run or a solution opened after Fix is solved, and hints opened after solving are never counted. A run that could not happen (no Python runtime) is not a failed run. The best score is saved by the page when the exercise is solved and only ever goes up.

**Repeat** (`repeat` action) clears the attempt (code, steps, hints, counters) and keeps `best`, so the home page still counts the exercise as solved. The page re-keys its steps and hints so their local state starts clean.

*Alternative rejected:* storing the score as a number when solving. It would hide how it was computed and could not show the receipt after a reload.

### Read-only code shares the editor's grammar
`lib/highlight.ts` highlights with `@lezer/highlight` on `@lezer/python`, the same grammar CodeMirror uses, and works on the server. `CodeBlock` renders it with line numbers, marked lines and `^^^^` pointers.

### Exercise text never becomes HTML
`lib/markdown.ts` parses the small subset exercises use into data, and `components/Markdown.tsx` renders that data as React elements. There is no `dangerouslySetInnerHTML` anywhere.

### The solution is a separate, generated file
`scripts/solutions.mjs` runs before `dev` and `build` and writes `public/solutions/<id>.json`. The interface fetches one only when "show solution" is unlocked (all hints open, or solved), so the solution is not in any page. It is public in the repository anyway, so this gate is pedagogical and not a secret.

### One design system, in one file
`app/globals.css` holds the tokens and component styles of the "Traceback" direction (mockups in `docs/design/mockups`). Tailwind is installed for its reset only.

## How it is tested

| Layer | Where | What it proves |
|---|---|---|
| Unit | `tests/unit` | schema, grading, rules analysis, run result mapping, progress model, Markdown, highlighting |
| Exercise gates | `tests/gates` | with real CPython: buggy fails, solution passes, every wrong fix fails, predict answers are true, locate lines are code. Negative controls prove each gate can fail |
| End to end | `tests/e2e` | the whole flow on desktop and a phone, keyboard-only, no horizontal scroll at 375 px, axe (no serious or critical), the runner (infinite loop, clean namespace, offline) |
| Real Pyodide | `tests/e2e/pyodide-gates.spec.ts` | the exercise gates again, inside the Pyodide that learners get |

## Known limits

- The Python runtime comes from a CDN (jsDelivr, pinned to 0.27.4) and is not checked with Subresource Integrity, because `importScripts` cannot do it. Hosting it ourselves would add ~10 MB to the repository and the deployment.
- Exercise folder names are part of the URLs and describe the bug.
- The end-to-end tests that run Python need network access.
- Exercises are checked on CPython 3.12 only.
