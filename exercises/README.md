# Contributing Exercises to BugLab

Each exercise lives in its own folder inside `exercises/`. The folder name becomes the exercise ID and determines the sort order on the home page.

## Folder naming

```
exercises/
  001-my-exercise-name/
    exercise.json      ← required
    solution.py        ← reference solution (never shown to users)
```

Use zero-padded numbers as prefix so exercises stay ordered: `001-`, `002-`, `042-`, etc.

---

## `exercise.json` schema

```json
{
  "title": "Human-readable title",
  "difficulty": "easy | medium | hard",
  "tags": ["loops", "strings", "recursion"],
  "description": "Markdown-ish description shown to the user. Explain what the function should do and hint that there is a bug. **Bold** and `inline code` are supported.",
  "buggyCode": "def solution(...):\n    # This is what the user starts with — it has one or more bugs\n    pass\n",
  "hints": [
    "First hint — shown only when the user asks.",
    "Second hint — more specific.",
    "Third hint — almost gives it away."
  ],
  "tests": [
    {
      "description": "optional short label",
      "input": "solution(arg1, arg2)",
      "expectedOutput": "expected_str"
    }
  ],
  "requirements": {
    "mustContain": ["for", "while"],
    "mustNotContain": ["eval", "exec", "sum("]
  },
  "setupCode": "# Optional Python code that runs before the user's code\n# Useful for defining helper classes, importing modules, etc.\n"
}
```

### Field details

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | Short, punchy name |
| `difficulty` | ✅ | `easy`, `medium`, or `hard` |
| `tags` | ✅ | At least one tag |
| `description` | ✅ | Explain what the function *should* do; don't spoil the bug |
| `buggyCode` | ✅ | The broken code the user starts from |
| `hints` | ✅ | 2–4 hints, from vague to specific |
| `tests` | ✅ | At least 3 test cases; cover edge cases |
| `requirements` | ❌ | Optional constraints on what the code must/must not contain |
| `setupCode` | ❌ | Run before user code (e.g. define helper functions) |

### Tests — `input` and `expectedOutput`

- `input` is a **Python expression** that gets evaluated with `str()` wrapped around it.
  - Example: `"solution(3, 5)"` → evaluated as `str(solution(3, 5))`
- `expectedOutput` is the expected **string** result.
  - `True` → `"True"`, `None` → `"None"`, `[1, 2]` → `"[1, 2]"`, etc.

### Requirements

Use `mustContain` to enforce that the user uses a specific construct (e.g. must use a loop). Use `mustNotContain` to prevent cheating (e.g. can't use the built-in `sum()`).

---

## Exercise design philosophy

BugLab is **not** a puzzle platform. The goal is to test real coding skills:

1. **Start with working code, then introduce a realistic bug.** Don't invent contrived puzzles — bugs like off-by-one errors, wrong return placement, incorrect conditions, mutable default arguments, etc.

2. **Make the bug subtle but learnable.** The user should have an "aha!" moment, not feel tricked.

3. **Write descriptive tests.** Include edge cases (empty input, single element, zero, negatives) that expose the bug clearly.

4. **Hints should guide, not solve.** Three hints: vague → more specific → almost the answer.

---

## Example

See `001-off-by-one/` as a reference implementation.
