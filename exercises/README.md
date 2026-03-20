# Contributing Exercises to BugLab

Each exercise lives in its own folder inside `exercises/`. The folder name becomes the exercise ID and determines the sort order on the home page.

## Folder structure

```
exercises/
  008-your-exercise-name/
    buggy.py        ← required — the broken code shown to the user
    solution.py     ← required — reference solution (never shown to users)
    exercise.json   ← required — metadata, description, hints, tests
```

**Folder naming:** use a zero-padded number prefix so exercises stay ordered — `001-`, `008-`, `042-`, etc. The rest of the name should be a short slug describing the exercise.

---

## `buggy.py`

This is a real Python file. Write it like any other Python — proper indentation, no string escaping. It contains the broken code the user will see and edit in the browser.

```python
# exercises/008-example/buggy.py

def find_first(items, target):
    for i in range(len(items) + 1):   # BUG: off by one
        if items[i] == target:
            return i
    return -1
```

The bug should be subtle enough that the user has to think, but obvious in hindsight.

---

## `solution.py`

The correct version of the code. Never shown to users — it's just a reference for you when writing tests.

```python
# exercises/008-example/solution.py

def find_first(items, target):
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1
```

---

## `exercise.json`

All metadata, the description, hints, and test cases.

```json
{
  "title": "Short punchy title",
  "difficulty": "easy | medium | hard",
  "tags": ["loops", "indexing"],
  "description": "What the function should do. **Bold** and `inline code` are supported.\n\nDon't reveal what the bug is — describe the expected behavior.",
  "hints": [
    "Vague hint — points the user in the right direction without spoiling.",
    "More specific hint — narrows it down.",
    "Almost the answer — user should be able to fix it after reading this."
  ],
  "tests": [
    {
      "description": "optional label shown in results",
      "input": "find_first([1, 2, 3], 2)",
      "expectedOutput": "1"
    }
  ],
  "requirements": {
    "mustContainKeyword": ["for"],
    "mustNotCallBuiltin": ["index"]
  }
}
```

---

## Field reference

### Top-level fields

| Field | Required | Description |
|---|---|---|
| `title` | ✅ | Short, punchy name. Max ~40 characters. |
| `difficulty` | ✅ | `"easy"`, `"medium"`, or `"hard"` |
| `tags` | ✅ | At least one. Examples: `loops`, `strings`, `recursion`, `closures`, `scope`, `math`, `dicts` |
| `description` | ✅ | What the function *should* do. Supports `**bold**` and `` `inline code` ``. Use `\n\n` for paragraphs. Do not reveal the bug. |
| `hints` | ✅ | Array of 2–4 hints, from vague to specific. |
| `tests` | ✅ | At least 3 test cases. See below. |
| `requirements` | ❌ | Optional constraints on the user's code. See below. |
| `setupCode` | ❌ | Python code that runs before the user's code. Useful for defining helpers or resetting global state. |

---

### `tests`

Each test runs `str(<input>)` in Python and compares the result to `expectedOutput`.

```json
{
  "description": "optional — shown in results panel",
  "input": "find_first([1, 2, 3], 2)",
  "expectedOutput": "1"
}
```

- `input` is any valid Python expression: `my_fn(arg1, arg2)`, `str(round(avg([1,2,3]), 2))`, etc.
- `expectedOutput` is always a string — Python's `str()` representation: `"True"`, `"None"`, `"[1, 2, 3]"`, `"3.14"`, etc.
- **Aim for 4–6 tests.** Cover the happy path, edge cases, and the cases that specifically expose the bug.

---

### `requirements`

Requirements are checked **before** tests run. If any requirement fails, tests are skipped and the user sees which constraint wasn't met.

Use these fields to prevent trivial solutions (e.g., banning a built-in so the user actually implements the logic manually).

#### AST-based (recommended — precise, no false positives)

| Field | Type | What it checks |
|---|---|---|
| `mustNotCallBuiltin` | `string[]` | User must not call these as a bare function: `max(...)`, `sum(...)`, etc. Uses AST — `find_max(x)` does **not** trigger `"max"`. |
| `mustNotImport` | `string[]` | User must not import these modules: `os`, `sys`, `subprocess`, etc. |
| `mustUseLoop` | `boolean` | Code must contain at least one `for` or `while` statement. |
| `mustUseRecursion` | `boolean` | Code must contain a recursive call (a function calling itself). |

#### Keyword-based (safe for Python reserved words)

| Field | Type | What it checks |
|---|---|---|
| `mustContainKeyword` | `string[]` | Source must contain these exact strings. Safe for reserved words like `for`, `while`, `return`, `yield`, `lambda`. Do not use for identifiers — use AST fields instead. |

#### Example

```json
"requirements": {
  "mustUseLoop": true,
  "mustNotCallBuiltin": ["sum", "max", "sorted"],
  "mustNotImport": ["collections"],
  "mustContainKeyword": ["return"]
}
```

---

## Design guidelines

BugLab is not a puzzle platform. The goal is to develop real debugging skills.

### The bug

- **Realistic.** It should be the kind of thing that ends up in real code — not a contrived gotcha.
- **Short fix.** The user should fix it in 1–5 lines. If fixing it requires rewriting the function, reconsider.
- **Visible on inspection.** Reading the code carefully should be enough. No trick questions.

### The description

- Describe what the function *should* do.
- Do not say "there is a bug in line X" or hint at the location.
- Do say what the expected behavior is, and optionally give a counterexample.

### The hints

Write exactly 3 hints in this progression:

1. **Observation** — "Try calling the function with X. What do you notice?"
2. **Direction** — "The issue is in the loop / the condition / the return statement."
3. **Near-answer** — "The problem is Y. Try changing Z to W."

### The tests

- At least one test should fail with the buggy code.
- At least one test should pass with both buggy and fixed code (to confirm you didn't break the happy path).
- Include edge cases: empty input, zero, negative numbers, single-element lists, etc.
- If a test is non-obvious, add a `"description"` field.

---

## Reference implementation

See [`001-off-by-one/`](001-off-by-one/) for a minimal, well-structured example.
