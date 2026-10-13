import { parser } from "@lezer/python";
import type { SyntaxNode } from "@lezer/common";
import type { Constraints } from "./schema";

export interface Violation {
  /** Which constraint was broken, e.g. "mustNotCall". */
  rule: keyof Constraints;
  message: string;
  /** 1-indexed line of the offending code, when there is one. */
  line?: number;
}

export interface AnalysisResult {
  /** The code does not parse. Constraints are not checked; Python will report it. */
  syntaxError: boolean;
  violations: Violation[];
}

/** One line of the "Constraints" list shown to the learner. */
export interface ConstraintLine {
  must: boolean;
  label: string;
  value: string;
}

/**
 * Checks the learner's code against an exercise's constraints by parsing it
 * (no execution), so it runs anywhere and never needs the Python runtime.
 */
export function checkConstraints(code: string, constraints: Constraints = {}): AnalysisResult {
  const tree = parser.parse(code);
  const lineAt = (pos: number) => code.slice(0, pos).split("\n").length;

  let syntaxError = false;
  const keywordNodes = new Set<string>();
  const calls: { name: string; line: number }[] = [];
  const imports: { module: string; line: number }[] = [];
  let hasLoop = false;
  let recursive = false;

  const text = (n: SyntaxNode) => code.slice(n.from, n.to);

  /** `f(...)` -> "f", `obj.f(...)` -> "f", anything else -> null. */
  const calleeName = (call: SyntaxNode): string | null => {
    const callee = call.firstChild;
    if (!callee) return null;
    if (callee.name === "VariableName") return text(callee);
    if (callee.name === "MemberExpression") {
      const prop = callee.lastChild;
      return prop && prop.name === "PropertyName" ? text(prop) : null;
    }
    return null;
  };

  const bareCalleeName = (call: SyntaxNode): string | null => {
    const callee = call.firstChild;
    return callee && callee.name === "VariableName" ? text(callee) : null;
  };

  const collectImports = (node: SyntaxNode) => {
    const line = lineAt(node.from);
    const kids: SyntaxNode[] = [];
    for (let c = node.firstChild; c; c = c.nextSibling) kids.push(c);
    if (kids[0]?.name === "from") {
      const mod = kids.slice(1).find((k) => k.name === "VariableName");
      if (mod) imports.push({ module: text(mod), line });
      return;
    }
    // `import a.b as c, d`: a top-level module name follows `import` and each comma
    let expectModule = false;
    for (const k of kids) {
      if (k.name === "import" || k.name === ",") expectModule = true;
      else if (expectModule && k.name === "VariableName") {
        imports.push({ module: text(k), line });
        expectModule = false;
      }
    }
  };

  const containsSelfCall = (node: SyntaxNode, name: string): boolean => {
    if (node.name === "CallExpression" && bareCalleeName(node) === name) return true;
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (containsSelfCall(c, name)) return true;
    }
    return false;
  };

  const hasSelfCall = (fn: SyntaxNode, name: string): boolean => {
    const body = fn.getChild("Body");
    return body ? containsSelfCall(body, name) : false;
  };

  tree.iterate({
    enter(ref) {
      const n = ref.node;
      const name = ref.name;
      if (ref.type.isError) syntaxError = true;
      keywordNodes.add(name === "Boolean" ? text(n) : name);
      if (name === "ForStatement" || name === "WhileStatement") hasLoop = true;
      else if (name === "CallExpression") {
        const callee = calleeName(n);
        if (callee) calls.push({ name: callee, line: lineAt(n.from) });
      } else if (name === "ImportStatement") collectImports(n);
      else if (name === "FunctionDefinition") {
        const fnName = n.getChild("VariableName");
        if (fnName && hasSelfCall(n, text(fnName))) recursive = true;
      }
    },
  });

  if (syntaxError) return { syntaxError: true, violations: [] };

  const violations: Violation[] = [];

  for (const kw of constraints.mustUseKeyword ?? []) {
    if (!keywordNodes.has(kw)) {
      violations.push({ rule: "mustUseKeyword", message: `Must use \`${kw}\`` });
    }
  }
  for (const name of constraints.mustCall ?? []) {
    if (!calls.some((c) => c.name === name)) {
      violations.push({ rule: "mustCall", message: `Must call \`${name}()\`` });
    }
  }
  for (const name of constraints.mustNotCall ?? []) {
    for (const c of calls.filter((c) => c.name === name)) {
      violations.push({ rule: "mustNotCall", message: `Must not call \`${name}()\``, line: c.line });
    }
  }
  for (const banned of constraints.mustNotImport ?? []) {
    for (const i of imports.filter((i) => i.module === banned)) {
      violations.push({ rule: "mustNotImport", message: `Must not import \`${banned}\``, line: i.line });
    }
  }
  if (constraints.mustUseLoop && !hasLoop) {
    violations.push({ rule: "mustUseLoop", message: "Must use a loop (`for` or `while`)" });
  }
  if (constraints.mustUseRecursion && !recursive) {
    violations.push({ rule: "mustUseRecursion", message: "Must use recursion (a function that calls itself)" });
  }

  return { syntaxError: false, violations };
}

/** Human-readable list of an exercise's constraints, for the instructions panel. */
export function describeConstraints(c: Constraints = {}): ConstraintLine[] {
  const lines: ConstraintLine[] = [];
  for (const k of c.mustUseKeyword ?? []) lines.push({ must: true, label: "must use", value: k });
  for (const k of c.mustCall ?? []) lines.push({ must: true, label: "must call", value: `${k}()` });
  for (const k of c.mustNotCall ?? []) lines.push({ must: false, label: "must not call", value: `${k}()` });
  for (const k of c.mustNotImport ?? []) lines.push({ must: false, label: "must not import", value: k });
  if (c.mustUseLoop) lines.push({ must: true, label: "must use a loop", value: "for / while" });
  if (c.mustUseRecursion) lines.push({ must: true, label: "must use recursion", value: "" });
  return lines;
}
