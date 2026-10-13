# BugLab

**Read the code. Find the bug.**

BugLab teaches beginners to *read* Python and spot errors. Each exercise is one short, broken function. You work through it in up to four steps:

| Step | You... | Checked by |
|---|---|---|
| **Predict** | read the code and type what a call returns | comparison with a stored answer |
| **Locate** | click the line where the bug is | stored line numbers |
| **Explain** | pick the real reason from a few options | stored answer |
| **Fix** | edit the code and run it against tests | running it, in your browser |

Each exercise is worth up to **100 points**: Predict 20, Locate 20, Explain 20 and Fix 40. A wrong answer costs 5, a run of the tests that does not pass costs 3, each hint costs 5, and opening the solution before solving makes Fix worth 0. When you solve an exercise you get a receipt that lists every line, a grade (S, A, B, C), the name of the bug and why it happens. **Repeat** starts an exercise over from scratch and keeps your best score; the home page adds up the best score of each exercise.

 Every step can be skipped or opened at any time (a skipped step is worth 0), hints open one at a time, and the reference solution unlocks after the last hint.

There is no backend, no account and no tracking. Python runs in your browser (Pyodide, in a Web Worker with a 5 second limit), and progress lives in your browser's `localStorage`.

## Run it locally

```bash
git clone https://github.com/HenryD11703/BugLab
cd BugLab
npm install
npm run dev        # http://localhost:3000
```

Needs Node 20.9 or newer (CI uses 22). Nothing else: no environment variables.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | develop, build, serve the build |
| `npm run lint` and `npm run typecheck` | ESLint and `tsc --noEmit` |
| `npm test` | unit tests **and the exercise gates** (needs Python on your `PATH`, ideally 3.12) |
| `npm run test:e2e` | builds, then runs Playwright on desktop and phone, with axe |
| `npm run check` | lint + typecheck + `npm test` |

CI runs all of this on every pull request, with Python 3.12 (the version Pyodide 0.27 ships).

## How it is built

- **Next.js 16** (App Router) with every page generated at build time, **React 19**, **TypeScript**, **Tailwind 4** for the reset only; the design lives in `app/globals.css`.
- **CodeMirror 6** for the editor and **`@lezer/python`** for parsing: it checks an exercise's rules ("no `sum()`", "use a loop") and highlights read-only code, without running anything.
- **Pyodide** in a Web Worker runs the learner's code. Every run starts in a fresh namespace, and a run that does not finish in 5 seconds is stopped by terminating the worker.
- **zod** validates every `exercise.json` at build time, so a broken exercise fails the build.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the decisions and the alternatives we rejected, and [`docs/00-principles.md`](docs/00-principles.md) for the rules that every change must respect.

## Exercises

There are 20 exercises, from easy to hard, each with all four steps. An exercise is a folder:

```
exercises/004-mutable-default/
  exercise.json     title, text, hints, explanation and the data for each step
  buggy.py          what the learner starts with
  solution.py       the reference solution
  wrong-fixes/      plausible wrong fixes that must still fail the tests
```

CI checks every exercise against real Python: the buggy code must fail, the solution must pass, every wrong fix must fail, and the answer to each Predict step must be what Python really prints.

**Want to add one?** Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and the format reference in [`exercises/README.md`](exercises/README.md).

## Known limits

- Running code needs to download Pyodide (about 10 MB) from a CDN the first time. Without it the Predict, Locate and Explain steps still work, and Fix says so.
- The names of the exercise folders are part of their URLs and describe the bug. The home page hides the bug names, the URLs do not.
- The reference solutions are public in this repository; "show solution" only unlocks them in the interface.

## License

MIT. See [`LICENSE`](LICENSE).
