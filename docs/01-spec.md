# BugLab spec (v0 draft)

Status: **v1, open questions answered; waiting for the owner's approval of the spec + plan + tasks together.** Describes *what* and *why*. No technology choices here; those go in `02-plan.md`.

## Problem
Most Python practice sites ask "can you write this?". Real work, and especially working with code written by others or by AI tools, asks "why is this broken?". Beginners get almost no practice at reading code and finding errors.

## Who it is for
Beginners learning Python who already know basic syntax (variables, loops, functions, lists) and want to build the habit of reading code carefully. No account, no install, nothing to configure.

## The learning loop
Each exercise is one short, broken function and walks the learner through up to four steps. Every step is optional per exercise (see open question Q1).

| Step | The learner... | Checked by |
|---|---|---|
| **Predict** | reads the code and types what a given call prints or returns | exact comparison with a stored answer, verified against real CPython in CI |
| **Locate** | clicks the line (or lines) where the bug is | stored line numbers |
| **Explain** | picks the real reason from 3-4 options | stored answer |
| **Fix** | edits the code and runs it against tests | running the code in the browser |

After the exercise is solved, the learner sees a short explanation of the bug and the pattern behind it ("mutable default argument"), plus a link to the next exercise.

## Acceptance criteria
Each criterion becomes an automated test (unit, E2E or CI gate) unless marked *manual*.

**Safety and correctness**
- AC-01 An infinite loop in the learner's code is stopped within 5 seconds, the page stays responsive, and a message explains what happened.
- AC-02 Running code twice, or switching between exercises, never lets a function from an earlier run satisfy a later one.
- AC-03 For all exercises, the buggy code fails at least one test and the reference solution passes all tests.
- AC-04 For all exercises, a set of declared wrong fixes (mutations) each fail at least one test.
- AC-05 For all Predict steps, the stored answer equals what CPython prints for that snippet.
- AC-06 Rule-based constraints ("don't use `sum()`", "use a loop") are checked by parsing, not by running code, and the reason is shown when broken.

**Experience**
- AC-07 A learner can finish an exercise on a 375 px wide phone without horizontal scrolling and with a usable editor.
- AC-08 The whole flow works with the keyboard only (run, hints, next exercise).
- AC-09 No axe violations of level "serious" or "critical" on the home page and an exercise page, desktop and mobile.
- AC-10 The home page loads without downloading the Python runtime. The runtime loads when an exercise needs to run code, and shows progress while it does.
- AC-11 If the runtime cannot load (offline, blocked), the learner sees a clear message and the reading steps still work.- AC-12 Progress and the last code written survive a page reload.
- AC-17 Any step can be opened or skipped at any time, and each step's state is remembered.
- AC-18 "Show solution" is not available until all hints are opened or the exercise is solved.
- AC-13 *(manual)* The visual design follows the Python-traceback direction chosen in the design step and is reviewed on desktop and phone.

**Content and project**
- AC-14 The 20 existing exercises are kept, fixed where wrong (exercise 010 does not fail with its buggy code today), and each has Locate and Explain data. Predict data is added where the bug shows in a single call's output.
- AC-15 Adding an exercise requires only a new folder and passing CI. `CONTRIBUTING.md` explains how.
- AC-16 `npm audit --omit=dev` reports 0 vulnerabilities; `tsc`, `eslint` and the build are clean.

## Non-goals
Accounts, leaderboards, a server, running code on a server, languages other than Python, AI-generated feedback, an in-app exercise editor.

## Decisions (answered by the owner, 2026-10-12)
- **Q1** Each exercise declares which steps it offers. The 20 existing ones start with Locate + Explain + Fix.
- **Q2** UI in English only. Spanish can be added later.
- **Q3** No new Predict-only exercises for now. The Predict step is built and proven on the 20 existing ones where it makes sense; new content comes after the CI gates exist.
- **Q4** A clear error message is enough when offline; no self-hosted runtime. Reading steps keep working without the runtime.
- **Flow:** steps are shown in a guided order, but any step can be opened or skipped at any time. Nobody gets stuck.
- **Solution:** a "Show solution" button appears once the learner has opened all hints or has solved the exercise. The solution is public in the repo anyway, so we do not try to hide it.
- **Theme:** dark only. Light mode is left for later.
- **Design (approved 2026-10-12 from the mockups in `docs/design/mockups/`):** the Python-traceback direction. IBM Plex Sans + Mono, one accent (coral, the caret under the bug), green for solved, amber for hints. On phones the exercise page has two tabs, *Read | Work* (editor and results together). The home list hides the name of each bug until the exercise is solved, and progress is shown as pytest-style dots.
- Product direction: *read and fix*. Engine: *hybrid* (Pyodide in a Web Worker for Fix; a parser for constraints and reading steps). Visual direction: *Python traceback / terminal*, explored with mockups before implementation. Audience: Python beginners.
