import { describe, expect, it } from "vitest";
import { checkConstraints, describeConstraints } from "@/lib/analysis";
import { PY_KEYWORDS } from "@/lib/schema";

const rules = (code: string, c: Parameters<typeof checkConstraints>[1]) =>
  checkConstraints(code, c).violations.map((v) => v.message);

describe("mustNotCall", () => {
  it("flags a banned builtin and reports its line", () => {
    const r = checkConstraints("total = 0\nx = sum([1, 2])\n", { mustNotCall: ["sum"] });
    expect(r.violations).toEqual([
      { rule: "mustNotCall", message: "Must not call `sum()`", line: 2 },
    ]);
  });

  it("does not confuse find_max with max", () => {
    expect(rules("def find_max(a):\n    return find_max(a[1:])\n", { mustNotCall: ["max"] })).toEqual([]);
  });

  it("is not fooled by the name inside a string or comment", () => {
    const code = "# sum(x) is not allowed\nmsg = 'sum(1)'\n";
    expect(rules(code, { mustNotCall: ["sum"] })).toEqual([]);
  });

  it("matches a method call by its name", () => {
    expect(rules("x = items.sort()\n", { mustNotCall: ["sort"] })).toHaveLength(1);
  });
});

describe("mustCall", () => {
  it("passes for a bare call and for a method call", () => {
    expect(rules("y = sorted(x)\n", { mustCall: ["sorted"] })).toEqual([]);
    expect(rules("n = d.get(k, 0)\n", { mustCall: ["get"] })).toEqual([]);
  });

  it("fails when the name is only mentioned, not called", () => {
    expect(rules("f = sorted\n", { mustCall: ["sorted"] })).toEqual(["Must call `sorted()`"]);
  });
});

describe("mustNotImport", () => {
  it.each([
    ["import os\n", 1],
    ["import sys, os.path\n", 1],
    ["from os import path\n", 1],
    ["import numpy as np\nimport os as o\n", 2],
  ])("flags os in %j", (code, line) => {
    const v = checkConstraints(code, { mustNotImport: ["os"] }).violations;
    expect(v).toHaveLength(1);
    expect(v[0].line).toBe(line);
  });

  it("allows other modules and lookalikes", () => {
    expect(rules("import osmosis\nfrom collections import Counter\n", { mustNotImport: ["os"] })).toEqual([]);
  });
});

describe("mustUseLoop", () => {
  it("accepts for and while, rejects neither", () => {
    expect(rules("for i in x:\n    pass\n", { mustUseLoop: true })).toEqual([]);
    expect(rules("while x:\n    pass\n", { mustUseLoop: true })).toEqual([]);
    expect(rules("y = 1\n", { mustUseLoop: true })).toHaveLength(1);
  });

  it("does not count a comprehension as a loop statement", () => {
    expect(rules("y = [i for i in x]\n", { mustUseLoop: true })).toHaveLength(1);
  });
});

describe("mustUseRecursion", () => {
  it("accepts a function that calls itself", () => {
    expect(rules("def f(n):\n    return f(n - 1) if n else 0\n", { mustUseRecursion: true })).toEqual([]);
  });

  it("rejects a function that only calls another function", () => {
    const code = "def g(n):\n    return n\n\ndef f(n):\n    return g(n)\n";
    expect(rules(code, { mustUseRecursion: true })).toHaveLength(1);
  });

  it("rejects a name that is called outside its own body", () => {
    expect(rules("def f(n):\n    return n\n\nf(1)\n", { mustUseRecursion: true })).toHaveLength(1);
  });
});

describe("mustUseKeyword", () => {
  const samples: Record<string, string> = {
    and: "x = a and b\n", as: "import a as b\n", assert: "assert x\n",
    async: "async def f():\n    pass\n", await: "async def f():\n    await g()\n",
    break: "while x:\n    break\n", class: "class A:\n    pass\n",
    continue: "while x:\n    continue\n", def: "def f():\n    pass\n",
    del: "del x\n", elif: "if a:\n    pass\nelif b:\n    pass\n",
    else: "if a:\n    pass\nelse:\n    pass\n", except: "try:\n    pass\nexcept E:\n    pass\n",
    finally: "try:\n    pass\nfinally:\n    pass\n", for: "for i in x:\n    pass\n",
    from: "from a import b\n", global: "def f():\n    global x\n",
    if: "if a:\n    pass\n", import: "import a\n", in: "y = a in b\n",
    is: "y = a is b\n", lambda: "f = lambda: 1\n", nonlocal: "def f():\n    def g():\n        nonlocal x\n",
    not: "y = not a\n", or: "y = a or b\n", pass: "pass\n",
    raise: "raise E\n", return: "def f():\n    return 1\n", try: "try:\n    pass\nexcept E:\n    pass\n",
    while: "while x:\n    pass\n", with: "with a as b:\n    pass\n", yield: "def f():\n    yield 1\n",
    None: "x = None\n", True: "x = True\n", False: "x = False\n",
  };

  it("has a sample for every keyword the schema allows", () => {
    expect(Object.keys(samples).sort()).toEqual([...PY_KEYWORDS].sort());
  });

  it.each(PY_KEYWORDS)("finds `%s` when present and not when absent", (kw) => {
    expect(rules(samples[kw], { mustUseKeyword: [kw] })).toEqual([]);
    expect(rules("x = 1\n", { mustUseKeyword: [kw] })).toEqual([`Must use \`${kw}\``]);
  });

  it("does not match a keyword inside a string, comment or identifier", () => {
    expect(rules("# for\nx = 'for'\nformat = 1\n", { mustUseKeyword: ["for"] })).toHaveLength(1);
  });

  it("counts the for of a comprehension", () => {
    expect(rules("y = [i for i in x]\n", { mustUseKeyword: ["for"] })).toEqual([]);
  });
});

describe("syntax errors and empty input", () => {
  it("skips constraint checks when the code does not parse", () => {
    const r = checkConstraints("def f(:\n", { mustUseLoop: true });
    expect(r).toEqual({ syntaxError: true, violations: [] });
  });

  it("reports every missing requirement on empty code", () => {
    expect(rules("", { mustUseLoop: true, mustCall: ["sorted"] })).toHaveLength(2);
  });

  it("passes with no constraints", () => {
    expect(rules("anything = 1\n", {})).toEqual([]);
  });
});

describe("describeConstraints", () => {
  it("lists constraints in a stable order for the UI", () => {
    expect(
      describeConstraints({ mustUseKeyword: ["for"], mustNotCall: ["sum"], mustUseLoop: true })
    ).toEqual([
      { must: true, label: "must use", value: "for" },
      { must: false, label: "must not call", value: "sum()" },
      { must: true, label: "must use a loop", value: "for / while" },
    ]);
  });
});
