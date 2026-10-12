# Exercise format

Each exercise is one folder in `exercises/`. The folder name is its id, its URL (`/exercise/<id>`) and its position in the list, so start it with a zero-padded number: `021-your-exercise-name`.

```
exercises/021-your-exercise-name/
  exercise.json     required: text, hints, explanation and the data for each step
  buggy.py          required: the broken code the learner starts with
  solution.py       required: the reference solution
  wrong-fixes/      required when there is a Fix step: *.py files, see below
```

`lib/schema.ts` is the source of truth; the build fails with the file and the reason if `exercise.json` does not match it. This page explains the fields and what the gates check.

## `buggy.py` and `solution.py`

Plain Python files, written like any other. The bug should be realistic and fixable in 1 to 5 lines. `solution.py` is shown after the learner unlocks it, so keep it clean and idiomatic.

## `exercise.json`

```jsonc
{
  "title": "The Haunted List",
  "difficulty": "medium",                 // easy | medium | hard
  "tags": ["functions", "defaults"],      // visible topics; do not name the bug
  "concept": "mutable-default-argument",  // kebab-case name of the bug, revealed after solving
  "description": "What the function SHOULD do. **Bold** and `code` work.\n\nNever say where the bug is.",
  "hints": ["observation", "direction", "almost the answer"],   // 2 to 4, in order
  "explanation": "Shown after solving: why it happens and the pattern to remember.",

  "predict": { "code": "append_to(1)\nappend_to(2)", "answer": "[1, 2]" },
  "locate":  { "bugs": [{ "lines": [1] }] },
  "explain": { "question": "Why ...?", "options": ["a", "b", "c"], "correct": 1 },
  "fix": {
    "tests": [{ "description": "first call", "input": "append_to(1)", "expected": "[1]" }],
    "constraints": { "mustUseKeyword": ["None"] }
  }
}
```

`predict`, `locate`, `explain` and `fix` are all optional, but an exercise needs at least one. A step that is missing is simply not shown.

### Text fields

`description`, `hints`, `explanation` and the `explain` texts support paragraphs, `- ` lists, fenced code, `` `code` ``, `**bold**` and `*italic*`. Raw HTML is never interpreted. Three hints, from an observation ("Try calling it with X") to a near-answer, work best.

### `predict`

`code` is Python statements ending in an expression. `answer` is what that last expression gives **when run against `buggy.py`**, written the way Python prints it (`str(...)`). If the call raises, the answer is the error name (`TypeError`). The learner's answer ignores spacing and quote style; error names ignore case.

### `locate`

One group per bug. Each group lists the 1-indexed lines of `buggy.py` that point at that bug; marking any line of a group finds it. The learner must find every group and mark nothing outside them. Lines must be code, not blank or comments.

### `explain`

3 or 4 options, one correct (`correct` is its index from 0). Write plausible wrong options that a beginner could believe.

### `fix`

- `tests`: at least 3. `input` is a Python expression evaluated after the learner's code runs, and `expected` is `str()` of its value. Cover the case that exposes the bug, a case that passes either way, and edge cases (empty input, zero, one element).
- `constraints` (optional): rules about the learner's code, checked by parsing it before anything runs.

  | Field | Meaning |
  |---|---|
  | `mustUseKeyword` | Python reserved words that must appear: `for`, `while`, `lambda`, `None`, `return`, ... |
  | `mustCall` / `mustNotCall` | names that must / must not be called. A name matches `f(...)` and `obj.f(...)`, so `find_max(x)` never matches `max` |
  | `mustNotImport` | top-level modules that must not be imported |
  | `mustUseLoop` | a `for` or `while` statement (a comprehension does not count) |
  | `mustUseRecursion` | a function that calls itself |

  Do not add a rule that rejects a correct solution. `solution.py` must obey its own constraints.
- `setup` (optional): Python that runs before the learner's code.

### `wrong-fixes/`

Plausible but wrong replacements for `buggy.py`, one file each (`only-range.py`, `forgot-abs.py`). Think about what a learner would try: fix only half of a two-bug exercise, use the wrong operator, break an edge case. **Each must fail at least one test.** If one passes, the tests are too weak: add a test that catches it.

## The gates

`npm test` runs every exercise through real Python (`tests/gates`) and fails if:

- `exercise.json` does not match the schema, or a file is missing
- `buggy.py` passes every test (the exercise teaches nothing) or does not load
- `solution.py` fails a test, or breaks one of its own constraints
- a file in `wrong-fixes/` passes every test
- `predict.answer` is not what Python prints for `buggy.py`
- a `locate` line is past the end of the file, blank or a comment

CI also runs all of this inside the real Pyodide runtime (`tests/e2e/pyodide-gates.spec.ts`), because Pyodide 0.27 ships Python 3.12 and some behaviour changes between versions. Never trust what you remember about Python: exercise 010 once shipped a claim about floating point that was false.

## Checklist

1. A realistic bug, fixable in a few lines.
2. The description says what the code should do, not where it breaks, and every claim in it is true when you run the code.
3. Tags are broad topics; the `concept` is the bug's name and stays hidden until solved.
4. `npm test` is green, and `npm run test:e2e` if you changed anything beyond exercise files.
