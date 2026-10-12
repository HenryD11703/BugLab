# Contributing to BugLab

Thanks for helping. The two most useful kinds of contribution are **new exercises** and **fixes to existing ones**. Before changing anything else, read [`docs/00-principles.md`](docs/00-principles.md): a change that breaks one of those rules needs to change that file first, on purpose.

## Setup

```bash
npm install
npm run check        # lint, types, unit tests and the exercise gates
```

The exercise gates run real Python. Pyodide 0.27 (the runtime in the browser) ships **Python 3.12**, and CI uses 3.12, so install that version if you can. On another version `npm test` still runs and prints a warning, but a result that differs from CI may be a version difference, not a bug.

If your Python is not on the `PATH` as `python` (or `python3` on macOS and Linux), set `PYTHON=/path/to/python`.

## Adding an exercise

1. Copy the closest existing folder to `exercises/NNN-your-name/` (next free number).
2. Write `buggy.py`, `solution.py` and `exercise.json`, and add at least one file in `wrong-fixes/`. The full format, with every field, is in [`exercises/README.md`](exercises/README.md).
3. Run it through the gates:

   ```bash
   npm test
   ```

   A failing gate names the exercise and the reason. Fix the exercise, not the gate.
4. Look at it in the browser: `npm run dev`, open the exercise, do each step, then break it on purpose. Read the description once more and make sure **every claim in it is true when you run the code**.
5. `npm run check`, then open a pull request.

A good exercise has one idea, a realistic bug that takes 1 to 5 lines to fix, a description that says what the code should do (never where it breaks), and wrong fixes a beginner would actually try.

## Changing the app

- Work on a branch, keep commits focused, and say *why* in the message.
- `npm run check` must pass. If you touched the interface, also run `npm run test:e2e`: it builds the site and drives it on a desktop and a phone viewport, with accessibility checks (axe). A change that adds a serious or critical axe violation will not be merged.
- Add a test for behaviour you add or fix. Grading logic (`lib/steps.ts`, `lib/analysis.ts`, `lib/runExercise.ts`) is plain TypeScript with unit tests; interface behaviour goes in `tests/e2e`.
- Keep the repository in English: UI text, code, comments and docs.
- Do not name a file `layout.ts` inside `app/`: Next treats it as special.

## What the end-to-end tests need

`npm run test:e2e` downloads Pyodide from a CDN in several tests, so it needs network access. That is the one place the test suite touches the network; keep the number of such tests small. The tests that check the offline behaviour block the CDN on purpose.

## Reporting a problem with an exercise

Open an issue with the exercise number, what you did and what you expected. "The description says X but the code does Y" is exactly the kind of report we want.
