# BugLab tasks (v0 draft)

Status: **DRAFT.** Order matters. A task is done only when its check passes. Estimates are honest working hours, not calendar time.

## P0 — broken things (about 2-3 h)
| ID | Task | Done when | AC |
|---|---|---|---|
| T01 | Upgrade `next` and other vulnerable packages; remove unused `gray-matter` | `npm audit --omit=dev` = 0, build passes | 16 |
| T02 | Fix the 2 lint errors (progress store with `useSyncExternalStore`, Pyodide instance state) | `eslint` clean | 16 |
| T03 | Fix exercise 010: new case that really fails with `==` (`0.5, 1.2, 1.3`), correct hint and README claim | buggy fails, solution passes (checked with CPython) | 14 |
| T04 | Correct the README (Next 16, no false claims) and add a repo `CLAUDE.md` | reviewed | 15 |

## P1 — robustness (about 8-10 h)
| ID | Task | Done when | AC |
|---|---|---|---|
| T10 | Add Vitest and Playwright + axe; GitHub Actions CI on Python 3.12 | CI green on the branch | 16 |
| T11 | Exercise schema v2 (zod) + loader; migrate the 20 exercises (Locate lines, Explain options, Predict where it fits, `wrong-fixes/`) | build fails on invalid content; 20 valid | 14 |
| T12 | Exercise gates against real CPython | gates pass on all 20; a deliberately broken exercise makes them fail | 03, 04, 05 |
| T13 | `lib/analysis` with `@lezer/python`: constraints with line numbers | unit tests for each constraint, including false-positive cases (`find_max` vs `max`) | 06 |
| T14 | Pyodide Web Worker runner: fresh namespace, 5 s timeout with recreate, lazy load, progress, offline error | E2E: infinite loop stops and the page stays alive; stale function no longer passes; error message when CDN blocked | 01, 02, 10, 11 |
| T15 | Progress store: completion + last code per exercise, versioned `localStorage` | unit tests; survives reload in E2E | 12 |

## P2 — product (about 10-12 h)
| ID | Task | Done when | AC |
|---|---|---|---|
| T20 | **Design gate:** two mockups (home, exercise; desktop and phone) in the traceback direction | owner approves | 13 |
| T21 | Design tokens, typography, base components (code block, traceback, step header, buttons) | visual review in the browser | 13 |
| T22 | Exercise page: Predict, Locate, Explain, Fix as a guided sequence with free navigation; "Show solution" gate; safe Markdown renderer; explanation after solve | E2E full flow per step, skip any step, solution locked until hints are opened | 07, 08, 17, 18 |
| T23 | Mobile layout: tabs below 768 px | E2E at 375 px: no horizontal scroll, editor usable | 07 |
| T24 | Home and search redesigned; progress shown | visual review; axe | 09, 12 |
| T25 | E2E + axe suite complete (desktop and phone), keyboard-only flow | all green in CI | 08, 09 |
| T26 | `README.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md` in English | reviewed | 15 |
| T27 | **Publish gate:** branch push, PR, merge, tag `v1.0.0`, Vercel variables (none needed) | owner confirms each public action | all |

## Dependencies
T01-T04 are independent. T11 needs T10. T12 needs T11. T14 needs T10. T22 needs T11, T13, T14, T15, T21. T21 needs T20.

## Gates (owner approves before we move on)
1. Spec + plan + tasks (now).
2. T20 design mockups.
3. T27 any push, PR or tag.
