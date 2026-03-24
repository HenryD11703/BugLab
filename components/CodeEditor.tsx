"use client";

import dynamic from "next/dynamic";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, indentUnit } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { indentWithTab } from "@codemirror/commands";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-[#141414] flex items-center justify-center">
      <span
        style={{ fontFamily: "var(--font-space-mono), monospace" }}
        className="text-xs text-[#555555] tracking-widest uppercase"
      >
        Loading editor...
      </span>
    </div>
  ),
});

// UI theme (background, gutter, cursor, selection)
const swissEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#141414",
      color: "#E8E8E8",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#E63329",
      padding: "1rem 0.5rem",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#E63329",
      borderLeftWidth: "2px",
    },
    ".cm-activeLine": {
      backgroundColor: "#1E1E1E",
    },
    ".cm-selectionBackground": {
      backgroundColor: "#E6332940 !important",
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "#E6332950 !important",
    },
    ".cm-gutters": {
      backgroundColor: "#0F0F0F",
      color: "#3A3A3A",
      border: "none",
      borderRight: "1px solid #1E1E1E",
      minWidth: "3rem",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      paddingRight: "1rem",
      paddingLeft: "0.5rem",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#1E1E1E",
      color: "#666666",
    },
    ".cm-matchingBracket": {
      backgroundColor: "transparent",
      outline: "1px solid #E63329",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "#2A2A2A",
      border: "none",
      color: "#888888",
    },
  },
  { dark: true }
);

// Syntax highlighting
const swissSyntaxHighlight = HighlightStyle.define([
  { tag: tags.keyword,            color: "#E63329", fontWeight: "bold" },
  { tag: tags.controlKeyword,     color: "#E63329", fontWeight: "bold" },
  { tag: tags.operatorKeyword,    color: "#E63329" },
  { tag: tags.definitionKeyword,  color: "#E63329", fontWeight: "bold" },
  { tag: tags.moduleKeyword,      color: "#E63329" },

  { tag: tags.string,             color: "#A8D080" },
  { tag: tags.special(tags.string), color: "#A8D080" },

  { tag: tags.number,             color: "#79B8FF" },
  { tag: tags.bool,               color: "#E63329" },
  { tag: tags.null,               color: "#E63329" },

  { tag: tags.comment,            color: "#4A4A4A", fontStyle: "italic" },

  { tag: tags.operator,           color: "#E8C87F" },
  { tag: tags.punctuation,        color: "#888888" },
  { tag: tags.bracket,            color: "#AAAAAA" },
  { tag: tags.squareBracket,      color: "#AAAAAA" },

  { tag: tags.definition(tags.function(tags.variableName)), color: "#79B8FF", fontWeight: "bold" },
  { tag: tags.definition(tags.variableName), color: "#E8E8E8" },
  { tag: tags.function(tags.variableName),   color: "#79B8FF" },
  { tag: tags.function(tags.propertyName),   color: "#79B8FF" },

  { tag: tags.className,          color: "#F0C97F", fontWeight: "bold" },
  { tag: tags.typeName,           color: "#F0C97F" },
  { tag: tags.propertyName,       color: "#C8C8C8" },

  { tag: tags.self,               color: "#E8A070" },
  { tag: tags.variableName,       color: "#E8E8E8" },

  { tag: tags.meta,               color: "#888888" },
  { tag: tags.invalid,            color: "#E63329", textDecoration: "underline" },
]);

const extensions: Extension[] = [
  python(),
  swissEditorTheme,
  syntaxHighlighting(swissSyntaxHighlight),
  EditorView.lineWrapping,
  indentUnit.of("    "),
  Prec.highest(keymap.of([indentWithTab])),
];

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps) {
  return (
    <div className="h-full overflow-hidden">
      <CodeMirror
        value={value}
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        theme="none"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: false,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: false,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: false,
          historyKeymap: true,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
        }}
        style={{ height: "100%", fontSize: "13px" }}
      />
    </div>
  );
}
