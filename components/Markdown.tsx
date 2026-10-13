import { parseInline, parseMarkdown, type Inline } from "@/lib/markdown";
import CodeBlock from "./CodeBlock";

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "text":
            return n.v;
          case "br":
            return <br key={i} />;
          case "code":
            return <code key={i} className="inline">{n.v}</code>;
          case "strong":
            return <strong key={i}><Inlines nodes={n.c} /></strong>;
          case "em":
            return <em key={i}><Inlines nodes={n.c} /></em>;
        }
      })}
    </>
  );
}

/** Exercise text as React elements. Nothing in `text` is ever interpreted as HTML. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="prose">
      {parseMarkdown(text).map((b, i) => {
        if (b.t === "p") return <p key={i}><Inlines nodes={b.c} /></p>;
        if (b.t === "ul") {
          return (
            <ul key={i}>
              {b.items.map((item, j) => <li key={j}><Inlines nodes={item} /></li>)}
            </ul>
          );
        }
        return <CodeBlock key={i} code={b.v} label="Code example" />;
      })}
    </div>
  );
}

/** A single line of Markdown (no block elements), for short labels. */
export function InlineMarkdown({ text }: { text: string }) {
  return <Inlines nodes={parseInline(text)} />;
}
