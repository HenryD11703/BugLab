# BugLab principles

Rules that hold for every decision below this line. If a task needs to break one, we change this file first, on purpose, not by accident.

1. **Grading is deterministic.** Whether an answer is right never depends on a model, a network call or chance. It depends on parsing, on running real Python, or on an exact comparison with a stored answer.
2. **User code never runs on a server.** BugLab has no backend. Python runs in the learner's browser, in a sandboxed Web Worker.
3. **A bad program must not break the page.** Infinite loops, huge output and exceptions end with a clear message and a working UI. Every run has a time limit.
4. **Every run starts clean.** No state survives from a previous run or another exercise. A pass must mean the code written *now* is correct.
5. **Every exercise is tested like code.** In CI, with real CPython: the buggy version fails, the reference solution passes, and plausible wrong fixes (mutations) still fail. An exercise that cannot pass these gates does not ship.
6. **The learner is a beginner.** Plain words, one idea per exercise, hints that go from nudge to answer, and an explanation of *why* after every solve.
7. **Reading comes before writing.** The product teaches people to read code and spot errors. Editing code is one way to prove it, not the only one.
8. **English everywhere in the repo.** UI text, code, docs and exercise content are in English.
9. **Usable by everyone.** Works on a phone, works with a keyboard only, passes automated accessibility checks (axe).
10. **Content is plain files.** An exercise is a folder anyone can add by pull request. No database, no admin panel.
11. **No accounts, no tracking.** Progress lives in the learner's own browser.
