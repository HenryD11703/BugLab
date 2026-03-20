# BugLab

**Not another LeetCode.**

BugLab is an open-source platform that challenges your ability to **write** and **review** code — not memorize algorithms or look up data structures. Every exercise starts with a broken Python snippet. You read it, understand it, and fix it.

---

## What makes it different

Most coding platforms ask: *"Can you implement X?"*

BugLab asks: *"This code is broken. Why?"*

That's a different skill — and arguably a more important one. In real work, you spend far more time reading and debugging existing code than writing it from scratch. BugLab builds that muscle.

- **No boilerplate.** Every exercise is a short function. No scaffolding, no imports to set up.
- **Realistic bugs.** Off-by-one errors. Mutable default arguments. Closures capturing by reference. The things that actually bite you.
- **Runs in your browser.** Python executes locally via [Pyodide](https://pyodide.org). No account, no server, no latency.
- **Fully open source.** The exercises are plain files in this repo. Anyone can add one.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Code editor | CodeMirror 6 |
| Python runtime | Pyodide (WASM, runs in browser) |
| Backend | None |

---

## Running locally

```bash
git clone https://github.com/HenryD11703/BugLab
cd BugLab
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Exercises

There are currently **20 exercises** spanning three difficulty levels:

| ID | Title | Difficulty | Concept |
|---|---|---|---|
| 001 | Off By One | Easy | `range(n - 1)` misses the last element |
| 002 | The Silent Return | Easy | `return` indented inside a loop body |
| 003 | Is It Prime? | Medium | Wrong base case + off-by-one in loop bound |
| 004 | The Haunted List | Medium | Mutable default argument |
| 005 | One Too Many | Medium | Counter initialized to 1 instead of 0 |
| 006 | Closure Trap | Hard | Lambda captures loop variable by reference |
| 007 | Vanishing Elements | Hard | Modifying a list while iterating over it |
| 008 | Exhausted | Hard | Generator expressions can only be iterated once |
| 009 | Identity Crisis | Medium | `is` checks identity, not value equality |
| 010 | Almost Equal | Medium | Comparing floats with `==` fails due to precision |
| 011 | Sorted by Nothing | Easy | `list.sort()` returns `None`, not the sorted list |
| 012 | The Lost Return | Medium | Missing `return` in a recursive branch |
| 013 | Zero Product | Easy | Wrong identity element for multiplication |
| 014 | Wrong by Design | Easy | Operator precedence: `a + b + c / 3` |
| 015 | Read-Only | Easy | Strings are immutable — item assignment crashes |
| 016 | Missing Key | Medium | `dict[key] += 1` raises `KeyError` on first occurrence |
| 017 | The Shared Row | Hard | `[row] * n` creates shared references, not copies |
| 018 | Wrong Rank | Easy | `enumerate` starts at `0` — ranks need `start=1` |
| 019 | Misleading Truth | Easy | Truthiness check passes for negative numbers |
| 020 | The Ignored Stars | Medium | List passed as one arg instead of unpacked with `*` |

---

## Contributing an exercise

Exercises are just files. To add one, create a folder in `exercises/`:

```
exercises/
  008-your-exercise-name/
    buggy.py        ← the broken code (what the user sees)
    solution.py     ← the fixed version (never shown to users)
    exercise.json   ← metadata, hints, and test cases
```

See **[exercises/README.md](exercises/README.md)** for the full schema, field reference, design guidelines, and examples.

### Ground rules for a good exercise

1. **Use a realistic bug** — something that would appear in real code, not a contrived trick.
2. **The bug should be fixable in 1–5 lines.** BugLab is about reading, not rewriting.
3. **Write tests that expose the bug.** If most tests pass with the buggy code, the exercise is broken.
4. **Don't spoil the bug in the description.** Describe what the function *should* do, not what's wrong with it.
5. **Write 3 hints**, progressively more specific. The last hint should nearly give it away.

---

## Roadmap

Milestones are ordered by scope and complexity, not by date. No fake deadlines.

### v0.2 — Polish & content
> Zero new architecture. Can be done today.

- **`Ctrl+Enter` to run** — keyboard shortcut in the editor so you never have to reach for the mouse
- **20+ exercises** — more Python gotchas: generator exhaustion, `is` vs `==`, float equality, dict key mutation, `*args` unpacking bugs
- **Proper Markdown rendering** — fenced code blocks, lists, italic in exercise descriptions (currently pseudo-markdown)
- **Share button** — the URL already identifies the exercise uniquely; just needs a one-click copy
- **Completion indicators** — `localStorage` marks exercises as solved; home page shows a check next to completed ones

### v0.3 — Multi-language
> Python via Pyodide is proven. JavaScript runs natively in the browser — no WASM needed.

- **JavaScript exercises** — same `exercise.json` schema, `buggy.js` / `solution.js`, sandboxed execution via Web Worker
- **Language filter** — extend the existing client-side filter on the home page
- Zero-backend constraint stays intact

### v0.4 — Community tooling
> Lower the friction for open source contributions.

- **`buglab validate` CLI** — run locally before opening a PR; checks schema validity, verifies that `buggy.py` fails the tests and `solution.py` passes them
- **GitHub PR template** — structured exercise submission checklist
- **Difficulty feedback** — users can flag if a difficulty label feels wrong (lightweight, file-based)

### v1.0 — Tracks
> Structured learning paths. New data model, still no backend.

- **`tracks/` folder** — a `track.json` lists exercise IDs in a curated order with a theme: "Python gotchas", "Loop pitfalls", "Scope & closures"
- **Track pages** — `/track/[id]` shows the sequence, descriptions, and progress
- **"Next exercise" navigation** — move through a track without going back to the home page
- **Track progress in `localStorage`** — no account needed

### Open ideas
Not committed, but worth capturing:

- **"Write the bug" mode** — reverse mode: given working code, introduce a bug that makes specific tests fail
- **VS Code extension** — solve exercises without leaving your editor
- **Classroom mode** — a teacher shares a link to a curated set; students work through it (requires a light backend)
- **Contextual AI hints** — opt-in: given the user's current code and the solution, generate a targeted hint via the Anthropic API
- **More languages** — Go, Rust, TypeScript (each needs a WASM runtime or a sandboxed eval strategy)

---

## Project structure

```
BugLab/
├── app/
│   ├── layout.tsx              — fonts, metadata
│   ├── page.tsx                — home page (server component)
│   └── exercise/[id]/
│       └── page.tsx            — exercise page (server → client handoff)
├── components/
│   ├── ExerciseClient.tsx      — main exercise UI (editor + panels)
│   ├── ExerciseList.tsx        — filterable exercise list (client component)
│   ├── CodeEditor.tsx          — CodeMirror 6 with custom Swiss dark theme
│   ├── HintsPanel.tsx          — progressive hint reveal
│   └── TestResults.tsx         — test result display
├── lib/
│   ├── types.ts                — TypeScript interfaces
│   ├── exercises.ts            — server-side exercise loader (reads buggy.py + exercise.json)
│   └── usePyodide.ts           — Pyodide hook (loads Python, runs AST checks + tests)
└── exercises/
    ├── README.md               — contributor guide
    ├── 001-off-by-one/
    ├── 002-silent-return/
    └── ...
```

---

## Design

BugLab follows the **Swiss International Typographic Style** — clean grid, strong typographic hierarchy, minimal decoration.

- **Fonts:** Space Grotesk (UI) + Space Mono (code, labels)
- **Palette:** `#0A0A0A` (near-black) · `#FAFAFA` (near-white) · `#E63329` (red accent)
- **No dark mode.** One intentional visual voice.

---

## License

MIT
