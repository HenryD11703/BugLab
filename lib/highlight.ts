import { parser } from "@lezer/python";
import { classHighlighter, highlightTree } from "@lezer/highlight";

export interface Token {
  text: string;
  /** CSS classes from Lezer's classHighlighter (tok-keyword, tok-string, ...); empty for plain text. */
  cls: string;
}

/**
 * Splits Python source into lines of styled tokens, using the same grammar
 * as the editor. Pure and synchronous, so it can run on the server.
 */
export function highlightLines(code: string): Token[][] {
  const tree = parser.parse(code);
  const spans: { from: number; to: number; cls: string }[] = [];
  highlightTree(tree, classHighlighter, (from, to, cls) => spans.push({ from, to, cls }));

  const tokens: Token[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.from > pos) tokens.push({ text: code.slice(pos, s.from), cls: "" });
    tokens.push({ text: code.slice(s.from, s.to), cls: s.cls });
    pos = s.to;
  }
  if (pos < code.length) tokens.push({ text: code.slice(pos), cls: "" });

  // regroup by line, splitting tokens that span a newline (strings, comments)
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    t.text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, cls: t.cls });
    });
  }
  // a trailing newline does not start a visible extra line
  if (code.endsWith("\n") && lines[lines.length - 1].length === 0) lines.pop();
  return lines;
}
