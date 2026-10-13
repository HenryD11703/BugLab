/**
 * A deliberately small Markdown parser for exercise text. It produces data,
 * not HTML, and the UI renders that data as React elements, so exercise text
 * can never inject markup. Supported: paragraphs, `- ` lists, fenced code,
 * `code`, **bold** and *italic*.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "br" }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "code"; v: string };

// Order matters: code spans win over emphasis, bold over italic. Emphasis
// markers must hug the text, so "x * y * z" is not italic.
const INLINE = /`([^`\n]+)`|\*\*(?=\S)(.+?\S|\S)\*\*|\*(?=[^\s*])([^*\n]*?[^\s*]|[^\s*])\*/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  const pushText = (s: string) => {
    s.split("\n").forEach((part, i) => {
      if (i > 0) out.push({ t: "br" });
      if (part) out.push({ t: "text", v: part });
    });
  };
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      pushText(rest);
      break;
    }
    if (m.index > 0) pushText(rest.slice(0, m.index));
    if (m[1] !== undefined) out.push({ t: "code", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "strong", c: parseInline(m[2]) });
    else out.push({ t: "em", c: parseInline(m[3]) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ t: "p", c: parseInline(para.join("\n")) });
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      flushPara();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      i++; // closing fence (or end of input)
      blocks.push({ t: "code", v: code.join("\n") });
      continue;
    }

    if (/^\s*[-*] +\S/.test(line)) {
      flushPara();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*] +\S/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*[-*] +/, "")));
        i++;
      }
      blocks.push({ t: "ul", items });
      continue;
    }

    if (line.trim() === "") flushPara();
    else para.push(line);
    i++;
  }
  flushPara();
  return blocks;
}
