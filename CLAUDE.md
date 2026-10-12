# CLAUDE.md — BugLab

Technical guide for anyone (human or AI) working in this repo. Read `docs/00-principles.md` first: those rules beat anything below.

## What this is
BugLab teaches beginners to **read** Python and spot errors. No backend, no accounts. Python runs in the learner's browser (Pyodide). The revamp is specified in `docs/01-spec.md`, designed in `docs/02-plan.md` and tracked in `docs/03-tasks.md`. Follow the task order there and keep those docs in sync when a decision changes.

## Stack
Next.js 16 (App Router, every page generated at build time, no server code), React 19, TypeScript, Tailwind 4 (reset only; the design is in `app/globals.css`), CodeMirror 6, `@lezer/python`, zod, Pyodide in a Web Worker. Vitest, Playwright + axe.

## Commands
```bash
npm install
npm run dev            # http://localhost:3000 (also writes public/solutions/*.json)
npm run lint
npm run typecheck
npm test               # unit tests + exercise gates (real Python; CI pins 3.12)
npm run test:e2e       # builds and runs Playwright, desktop and phone, with axe
npm run check          # lint + typecheck + npm test
npm audit --omit=dev   # must report 0
```
Kill any server on port 3100 before `test:e2e`: Playwright reuses it and would test a stale build.

## Map
- `exercises/<id>/` content; format in `exercises/README.md`, validated by `lib/schema.ts`.
- `lib/`: `steps.ts` (grading of the reading steps), `analysis.ts` (rules by parsing), `runner.ts` + `public/python-worker.js` (Python in a worker, 5 s limit), `runExercise.ts`, `progress-model.ts` + `progress.ts`, `markdown.ts`, `highlight.ts`.
- `components/exercise/`: the page; `components/home/`: the list; `components/CodeBlock.tsx`, `Markdown.tsx`, `CodeEditor.tsx`.
- `tests/unit`, `tests/gates` (exercises against real CPython), `tests/e2e`.
- `docs/ARCHITECTURE.md` explains the decisions; `docs/00-principles.md` are the rules.

## Exercises
One folder per exercise in `exercises/` (`buggy.py`, `solution.py`, `exercise.json`). See `exercises/README.md`. Hard rules:
- The buggy code must **fail** at least one test and `solution.py` must **pass** all of them. Verify with real Python, never assume: exercise 010 once shipped with a claim about float behaviour that was false in CPython.
- Pyodide 0.27.x runs CPython 3.12, so check against 3.12 (CI will).

## Conventions
- English for UI text, code, comments and docs.
- Browser-only state goes through `lib/progress.ts` / `lib/runner.ts` (`useSyncExternalStore`), not `useEffect` + `setState` (the lint rule `react-hooks/set-state-in-effect` is on and correct).
- Exercise text is rendered by `components/Markdown.tsx` as React elements. Never use `dangerouslySetInnerHTML`.
- Every claim in an exercise description must be true when you run the code (002 and 020 once said things the code did not do).
- Never run learner code on a server. Never compare a model's opinion with a test result: grading is deterministic.
- Do not name a file `layout.ts` inside `app/`: Next treats it as special.

## Git
Work on `feat/revamp`, never on `main`. Commit identity is set locally (`git config --local`). Do not push, open PRs or tag without the owner's explicit OK.
