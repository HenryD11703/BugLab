"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { python } from "@codemirror/lang-python";
import { EditorView, keymap } from "@codemirror/view";
import { Extension, Prec } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, indentUnit } from "@codemirror/language";
import { indentLess, indentMore } from "@codemirror/commands";
import { tags } from "@lezer/highlight";
import { RUN_EVENT } from "./runEvent";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="mono dim" style={{ padding: 16, fontSize: 12 }}>Loading editor…</div>,
});

// Colours match the read-only code blocks (see globals.css, the Traceback design).
const theme = EditorView.theme(
  {
    "&": { backgroundColor: "#121418", color: "#e9e6df", height: "100%" },
    ".cm-content": { caretColor: "#e9e6df", padding: "10px 0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#e9e6df", borderLeftWidth: "2px" },
    ".cm-activeLine": { backgroundColor: "rgba(233, 230, 223, 0.04)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(230, 193, 90, 0.28) !important" },
    ".cm-gutters": { backgroundColor: "#121418", color: "#6b7079", border: "none", borderRight: "1px solid #262a31" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 14px 0 10px", minWidth: "44px" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(233, 230, 223, 0.04)", color: "#9096a0" },
    ".cm-line": { padding: "0 16px" },
    ".cm-matchingBracket": { backgroundColor: "transparent", outline: "1px solid #ff6b4a" },
  },
  { dark: true }
);

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword, tags.operatorKeyword, tags.null], color: "#ff8d6e" },
  { tag: [tags.string, tags.special(tags.string)], color: "#a6d98b" },
  { tag: [tags.number, tags.bool], color: "#e6c15a" },
  { tag: tags.comment, color: "#6b7079", fontStyle: "italic" },
  { tag: [tags.operator, tags.punctuation, tags.bracket, tags.squareBracket], color: "#cfccc5" },
  { tag: [tags.definition(tags.variableName), tags.function(tags.variableName), tags.className], color: "#7aa8f0" },
  { tag: tags.invalid, color: "#ff6b4a", textDecoration: "underline" },
]);

// Keyboard users must be able to leave the editor: Tab indents until Esc is
// pressed, then Tab moves focus on. Any other key turns indenting back on.
function createExtensions(label: string): Extension[] {
  let tabLeaves = false;
  return [
    python(),
    theme,
    syntaxHighlighting(highlight),
    indentUnit.of("    "),
    EditorView.contentAttributes.of({ "aria-label": label }),
    EditorView.domEventHandlers({
      keydown(e) {
        if (e.key !== "Escape" && e.key !== "Tab") tabLeaves = false;
        return false;
      },
    }),
    Prec.highest(
      keymap.of([
        {
          key: "Mod-Enter",
          run: (view) => {
            view.dom.dispatchEvent(new CustomEvent(RUN_EVENT, { bubbles: true }));
            return true;
          },
        },
        { key: "Escape", run: () => { tabLeaves = true; return true; } },
        { key: "Tab", run: (view) => (tabLeaves ? false : indentMore(view)) },
        { key: "Shift-Tab", run: (view) => (tabLeaves ? false : indentLess(view)) },
      ])
    ),
  ];
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export default function CodeEditor({ value, onChange, label }: CodeEditorProps) {
  const [extensions] = useState(() => createExtensions(label));

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      onChange={onChange}
      theme="none"
      indentWithTab={false}
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
        tabSize: 4,
      }}
      height="100%"
      style={{ height: "100%", fontSize: "13.5px" }}
    />
  );
}
