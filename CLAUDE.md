# CLAUDE.md — BugLab

Technical guide for anyone (human or AI) working in this repo. Read `docs/00-principles.md` first: those rules beat anything below.

## What this is
BugLab teaches beginners to **read** Python and spot errors. No backend, no accounts. Python runs in the learner's browser (Pyodide). The revamp is specified in `docs/01-spec.md`, designed in `docs/02-plan.md` and tracked in `docs/03-tasks.md`. Follow the task order there and keep those docs in sync when a decision changes.

## Stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, CodeMirror 6 (`@lezer/python` for parsing).

## Commands
```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # eslint
npx tsc --noEmit   # types
npm run build      # production build (no env vars needed)
npm audit --omit=dev   # must report 0
```
More scripts (unit tests, exercise gates, E2E) arrive with task T10.

## Exercises
One folder per exercise in `exercises/` (`buggy.py`, `solution.py`, `exercise.json`). See `exercises/README.md`. Hard rules:
- The buggy code must **fail** at least one test and `solution.py` must **pass** all of them. Verify with real Python, never assume: exercise 010 once shipped with a claim about float behaviour that was false in CPython.
- Pyodide 0.27.x runs CPython 3.12, so check against 3.12 (CI will).

## Conventions
- English for UI text, code, comments and docs.
- Browser-only state goes through `lib/progress.ts` (`useSyncExternalStore`), not `useEffect` + `setState` (the lint rule `react-hooks/set-state-in-effect` is on and correct).
- Never run learner code on a server. Never compare a model's opinion with a test result: grading is deterministic.
- Do not name a file `layout.ts` inside `app/`: Next treats it as special.

## Git
Work on `feat/revamp`, never on `main`. Commit identity is set locally (`git config --local`). Do not push, open PRs or tag without the owner's explicit OK.
