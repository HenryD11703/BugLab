# BugLab technical plan (v0 draft)

Status: **DRAFT.** How we meet `01-spec.md` under `00-principles.md`. Each decision lists the alternative we rejected.

## Stack
Keep Next.js (upgraded to a patched version), React 19, TypeScript, Tailwind 4 and CodeMirror 6. Add Vitest, Playwright + axe, and a GitHub Actions workflow. Rejected: switching framework. Nothing in the spec needs it.

**Every page is generated at build time, and there is no server code** (no API routes, no server actions; principle 2). Rejected: `output: "export"`. It adds nothing here, and `next start` (used by the end-to-end tests) does not serve an export. Rejected: server rendering: attack surface and cost for no benefit.

## Exercise format (v2)
One folder per exercise, validated at build time by a strict schema. Invalid content fails the build with the file and the reason.

```
exercises/004-mutable-default/
  exercise.json        metadata, steps, hints, explanation
  buggy.py             what the learner starts with
  solution.py          reference solution (CI only)
  wrong-fixes/*.py     plausible wrong fixes that must still fail (mutations)
```

`exercise.json` declares its steps. A step that is absent is simply not shown:

```jsonc
{
  "title": "The Haunted List", "difficulty": "medium", "concept": "mutable-default-argument",
  "description": "...", "hints": ["...", "...", "..."], "explanation": "...",
  "predict": { "call": "append_to(1)\nappend_to(2)", "answer": "[1, 2]" },
  "locate":  { "bugs": [{ "lines": [1] }] },
  "explain": { "question": "...", "options": ["...", "...", "..."], "correct": 0 },
  "fix":     { "tests": [{ "input": "append_to(1)", "expected": "[1]" }], "constraints": { "mustUseKeyword": ["None"] } }
}
```

- `predict.answer` is what the **buggy** code gives for the last expression of `predict.code`, or the exception class name (`TypeError`). CI checks it against CPython.
- `locate.bugs` has one group per bug; each group lists equivalent lines. The learner finds a bug by marking any line of its group, and must find every group.
- `fix.constraints`: `mustUseKeyword` (Python reserved words only), `mustCall` / `mustNotCall` (a name matches `f(...)` and `obj.f(...)`), `mustNotImport`, `mustUseLoop`, `mustUseRecursion`.

Schema library: **zod**. Rejected: a hand-written validator, since error messages and types come free. One small dependency.

## Engine: hybrid
**1. Parser (no execution).** `@lezer/python` is already installed through CodeMirror. A module `lib/analysis` walks its tree for constraints (banned builtin calls, banned imports, loops, recursion, required keywords) and returns violations with line numbers. It runs in plain Node, so it is unit-tested without a browser. Replaces the Python `ast` script that runs inside Pyodide today. Rejected: keeping the AST check in Pyodide, because it forces loading ~10 MB just to read code.

**2. Runner (real Python).** Pyodide in a **dedicated Web Worker**, loaded only when the learner presses Run for the first time (AC-10), version pinned (v0.27.x, CPython 3.12).
- *Fresh namespace per run:* each run executes in a new `dict`, never in Pyodide's global scope (AC-02).
- *Time limit:* the page starts a timer per run. When it expires the worker is terminated and recreated, and the learner gets a message (AC-01). Rejected: Pyodide's interrupt buffer. It needs `SharedArrayBuffer`, which needs special response headers that static hosting often cannot set.
- *Protocol:* `run(code, tests, setup) -> { status, results[], stdout, error }` over `postMessage`; output is size-capped.
- *Offline:* if the CDN script fails to load the UI shows a clear error and the reading steps keep working (AC-11).

Rejected: running Python on a server (violates principle 2).

## State and storage
Progress and the last code per exercise live in `localStorage` under a versioned key, read through `useSyncExternalStore`. That is the React-recommended pattern for external stores and also fixes the current lint errors (AC-12).

## Interface
- Exercise page is a guided sequence: Predict, Locate, Explain, Fix. The order is a suggestion; every step can be opened or skipped at any time (AC-17). "Show solution" unlocks after all hints are opened or after solving (AC-18).
- Dark theme only for v1.
- Below 900 px the exercise page switches from two columns to two tabs (*Read | Work*), so the editor gets the full width and the results stay under it (AC-07). Approved in the design gate.
- Everything is operable with the keyboard; focus order and `aria-live` for results are tested (AC-08, AC-09).
- **Design**: Python traceback / terminal direction. Errors are shown as real-looking tracebacks with `^^^^` markers, code is the hero, line numbers are part of the layout. Two mockups (home and exercise, desktop and phone) are approved before any component is built (AC-13).
- Exercise description rendering: replace the home-made `markdownToHtml` + `dangerouslySetInnerHTML` with a small, tested Markdown parser that renders React elements (no raw HTML at all).
- Read-only code (Predict, Locate, hero) is highlighted with `@lezer/highlight` on the same Lezer grammar; the editor is CodeMirror with a matching theme.
- `Show solution` loads the solution from a static JSON file (`/solutions/<id>`) only when unlocked, so it is not in the page payload. It is public in the repo anyway; the gate is pedagogical.
- The `/search` page is folded into the home list as a text filter; one page less to keep consistent.
- Pages stay statically generated; a test of the build output is not needed because there is no server code to run.

## Quality gates (CI)
Run on every push and pull request, on Python 3.12 to match Pyodide:
1. `tsc --noEmit`, `eslint`, `npm audit --omit=dev`, `next build`.
2. **Exercise gates (Vitest, real CPython subprocess):** schema valid; buggy fails; solution passes; every `wrong-fixes/*.py` fails; every Predict answer equals CPython's output; Locate lines exist in `buggy.py`; test cases never pass vacuously (AC-03, 04, 05).
3. Unit tests for `lib/analysis`, the schema, the progress store.
4. Playwright (desktop and phone) with axe: full exercise flow, timeout of an infinite loop, no leaking state between runs, keyboard-only flow, no horizontal scroll (AC-01, 02, 07, 08, 09).

One known gap: the E2E suite needs the Pyodide CDN, so those tests depend on the network. We keep them few and say so in `CONTRIBUTING.md`.

## Documentation
`README.md` (accurate stack and how it works), `CONTRIBUTING.md` (how to add an exercise, with the gates explained), `docs/ARCHITECTURE.md` (this plan, kept in sync after the build), repo `CLAUDE.md`.

## Risks
- Pyodide 0.27 runs CPython 3.12, but contributors may run another version locally. CI pins 3.12; `CONTRIBUTING.md` says so.
- Some bugs only appear in specific Python versions. The gate runs on 3.12 only, and exercise 010 shows why: the behaviour must be checked, never assumed.
- Terminating and recreating the worker re-initialises Pyodide (a second or two, cached after the first load). Acceptable for the rare timeout case.
