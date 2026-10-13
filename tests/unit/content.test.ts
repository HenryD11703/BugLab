import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "@/lib/markdown";
import { canShowSolution, checkExplain, checkLocate, checkPredict } from "@/lib/steps";
import { highlightLines } from "@/lib/highlight";
import { getAllExercises } from "@/lib/exercises";

describe("parseInline", () => {
  it("parses code, bold and italic", () => {
    expect(parseInline("a `b` **c** *d*")).toEqual([
      { t: "text", v: "a " },
      { t: "code", v: "b" },
      { t: "text", v: " " },
      { t: "strong", c: [{ t: "text", v: "c" }] },
      { t: "text", v: " " },
      { t: "em", c: [{ t: "text", v: "d" }] },
    ]);
  });

  it("does not italicise a multiplication sign or touch stars inside code", () => {
    expect(parseInline("x * y * z")).toEqual([{ t: "text", v: "x * y * z" }]);
    expect(parseInline("use `*args` and `**kw`")).toEqual([
      { t: "text", v: "use " },
      { t: "code", v: "*args" },
      { t: "text", v: " and " },
      { t: "code", v: "**kw" },
    ]);
  });

  it("keeps HTML as plain text (it is never interpreted)", () => {
    const out = parseInline("<img src=x onerror=alert(1)> and <b>hi</b>");
    expect(out).toEqual([{ t: "text", v: "<img src=x onerror=alert(1)> and <b>hi</b>" }]);
  });

  it("turns single newlines into line breaks", () => {
    expect(parseInline("a\nb")).toEqual([{ t: "text", v: "a" }, { t: "br" }, { t: "text", v: "b" }]);
  });

  it("leaves an unmatched marker as text", () => {
    expect(parseInline("a **b")).toEqual([{ t: "text", v: "a **b" }]);
    expect(parseInline("a ` b")).toEqual([{ t: "text", v: "a ` b" }]);
  });
});

describe("parseMarkdown", () => {
  it("splits paragraphs, lists and fenced code", () => {
    const blocks = parseMarkdown("One.\n\n- a\n- b `c`\n\n```python\nx = 1\ny = 2\n```\n\nEnd.");
    expect(blocks.map((b) => b.t)).toEqual(["p", "ul", "code", "p"]);
    expect(blocks[2]).toEqual({ t: "code", v: "x = 1\ny = 2" });
    expect(blocks[1]).toMatchObject({ t: "ul", items: expect.any(Array) });
  });

  it("handles an unterminated fence and CRLF", () => {
    expect(parseMarkdown("```\nx\r\ny")).toEqual([{ t: "code", v: "x\ny" }]);
  });

  it("parses every exercise text without leaving markers behind", () => {
    const leftovers: string[] = [];
    const walk = (inl: ReturnType<typeof parseInline>) => {
      for (const n of inl) {
        if (n.t === "text" && /\*\*|`/.test(n.v)) leftovers.push(n.v);
        if (n.t === "strong" || n.t === "em") walk(n.c);
      }
    };
    for (const ex of getAllExercises()) {
      for (const text of [ex.description, ex.explanation, ...ex.hints, ex.explain?.question ?? ""]) {
        for (const b of parseMarkdown(text)) {
          if (b.t === "p") walk(b.c);
          if (b.t === "ul") b.items.forEach(walk);
        }
      }
    }
    expect(leftovers).toEqual([]);
  });
});

describe("checkPredict", () => {
  it("ignores spacing and quote style", () => {
    expect(checkPredict("[1,2]", "[1, 2]")).toBe(true);
    expect(checkPredict('["a", "b"]', "['a', 'b']")).toBe(true);
    expect(checkPredict("  (2,   0) ", "(2, 0)")).toBe(true);
  });

  it("is exact otherwise", () => {
    expect(checkPredict("[2]", "[1, 2]")).toBe(false);
    expect(checkPredict("true", "True")).toBe(false);
    expect(checkPredict("None", "none")).toBe(false);
    expect(checkPredict("", "None")).toBe(false);
  });

  it("accepts an error name in any case", () => {
    expect(checkPredict("typeerror", "TypeError")).toBe(true);
    expect(checkPredict("KeyError", "TypeError")).toBe(false);
  });
});

describe("checkLocate", () => {
  const one = [{ lines: [3] }];
  const two = [{ lines: [3] }, { lines: [4] }];
  const either = [{ lines: [2, 4] }];

  it("needs a selection", () => expect(checkLocate([], one)).toEqual({ status: "empty" }));
  it("accepts the bug line", () => expect(checkLocate([3], one)).toEqual({ status: "correct" }));
  it("rejects a stray line, even next to the right one", () => {
    expect(checkLocate([5], one)).toEqual({ status: "wrong" });
    expect(checkLocate([3, 5], one)).toEqual({ status: "wrong" });
  });
  it("accepts any line of an equivalent group", () => {
    expect(checkLocate([2], either)).toEqual({ status: "correct" });
    expect(checkLocate([4], either)).toEqual({ status: "correct" });
    expect(checkLocate([2, 4], either)).toEqual({ status: "correct" });
  });
  it("reports progress when an exercise has several bugs", () => {
    expect(checkLocate([3], two)).toEqual({ status: "partial", found: 1, total: 2 });
    expect(checkLocate([3, 4], two)).toEqual({ status: "correct" });
  });
});

describe("checkExplain and the solution gate", () => {
  it("checks the chosen option", () => {
    expect(checkExplain(1, 1)).toBe(true);
    expect(checkExplain(0, 1)).toBe(false);
    expect(checkExplain(null, 0)).toBe(false);
  });

  it("opens the solution only after all hints or after solving", () => {
    expect(canShowSolution(0, 3, false)).toBe(false);
    expect(canShowSolution(2, 3, false)).toBe(false);
    expect(canShowSolution(3, 3, false)).toBe(true);
    expect(canShowSolution(0, 3, true)).toBe(true);
  });
});

describe("highlightLines", () => {
  it("keeps the code intact, line by line", () => {
    const code = "def f(x):\n    return x  # done\n";
    const lines = highlightLines(code);
    expect(lines.map((l) => l.map((t) => t.text).join(""))).toEqual(["def f(x):", "    return x  # done"]);
  });

  it("marks keywords, strings and numbers", () => {
    const flat = highlightLines('for i in range(3): s = "x"').flat();
    const cls = (text: string) => flat.find((t) => t.text === text)?.cls;
    expect(cls("for")).toBe("tok-keyword");
    expect(cls("3")).toBe("tok-number");
    expect(cls('"x"')).toBe("tok-string");
  });

  it("splits a multi-line string across lines without losing text", () => {
    const code = 's = """a\nb"""\n';
    expect(highlightLines(code).map((l) => l.map((t) => t.text).join(""))).toEqual(['s = """a', 'b"""']);
  });

  it("reproduces every buggy.py exactly", () => {
    for (const ex of getAllExercises()) {
      const rebuilt = highlightLines(ex.buggyCode).map((l) => l.map((t) => t.text).join("")).join("\n");
      expect(rebuilt).toBe(ex.buggyCode.replace(/\n$/, ""));
    }
  });
});
