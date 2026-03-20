"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Exercise, Requirements, RunResult, TestResult } from "./types";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _pyodideInstance: any;
  }
}

type PyodideStatus = "idle" | "loading" | "ready" | "error";

// Python script that uses the ast module to check requirements accurately.
// Variables are injected via pyodide.globals.set() to avoid any string-escaping issues.
const AST_CHECK_SCRIPT = `
import ast, json as _json

_violations = []
_reqs = _json.loads(_reqs_json)
_code = _user_code

try:
    _tree = ast.parse(_code)
except SyntaxError:
    # Syntax errors are handled separately; skip AST checks
    _tree = None

if _tree is not None:

    # mustNotCallBuiltin — checks Call nodes where func is a bare Name
    # e.g. max([1,2]) triggers, but find_max([1,2]) does NOT
    _banned_builtins = _reqs.get("mustNotCallBuiltin", [])
    if _banned_builtins:
        class _CallChecker(ast.NodeVisitor):
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name) and node.func.id in _banned_builtins:
                    _violations.append(f"Must not use built-in '{node.func.id}()'")
                self.generic_visit(node)
        _CallChecker().visit(_tree)

    # mustNotImport — checks Import and ImportFrom nodes
    _banned_imports = _reqs.get("mustNotImport", [])
    if _banned_imports:
        for _node in ast.walk(_tree):
            if isinstance(_node, ast.Import):
                for _alias in _node.names:
                    if _alias.name.split(".")[0] in _banned_imports:
                        _violations.append(f"Must not import '{_alias.name}'")
            elif isinstance(_node, ast.ImportFrom):
                if _node.module and _node.module.split(".")[0] in _banned_imports:
                    _violations.append(f"Must not import from '{_node.module}'")

    # mustUseLoop — at least one For or While node anywhere in the tree
    if _reqs.get("mustUseLoop"):
        _has_loop = any(isinstance(_n, (ast.For, ast.While)) for _n in ast.walk(_tree))
        if not _has_loop:
            _violations.append("Must use a loop (for or while)")

    # mustUseRecursion — any Call whose func name matches a top-level FunctionDef
    if _reqs.get("mustUseRecursion"):
        _defined_fns = {
            _n.name for _n in ast.walk(_tree) if isinstance(_n, ast.FunctionDef)
        }
        _called_names = {
            _n.func.id
            for _n in ast.walk(_tree)
            if isinstance(_n, ast.Call) and isinstance(_n.func, ast.Name)
        }
        if not (_defined_fns & _called_names):
            _violations.append("Must use recursion")

_json.dumps(_violations)
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRequirementsAST(pyodide: any, code: string, reqs: Requirements): Promise<string[]> {
  const violations: string[] = [];

  // 1. Legacy string match — only for mustContain / mustNotContain
  //    These should only be used with Python reserved keywords (safe).
  for (const token of reqs.mustContain ?? []) {
    if (!code.includes(token)) {
      violations.push(`Code must contain: \`${token}\``);
    }
  }
  for (const token of reqs.mustNotContain ?? []) {
    if (code.includes(token)) {
      violations.push(`Code must not contain: \`${token}\``);
    }
  }

  // 2. mustContainKeyword — string match, but only for reserved words (safe)
  for (const kw of reqs.mustContainKeyword ?? []) {
    if (!code.includes(kw)) {
      violations.push(`Must use keyword: \`${kw}\``);
    }
  }

  // 3. AST-based checks via Pyodide
  const astReqs = {
    mustNotCallBuiltin: reqs.mustNotCallBuiltin ?? [],
    mustNotImport: reqs.mustNotImport ?? [],
    mustUseLoop: reqs.mustUseLoop ?? false,
    mustUseRecursion: reqs.mustUseRecursion ?? false,
  };

  const hasAstChecks =
    astReqs.mustNotCallBuiltin.length > 0 ||
    astReqs.mustNotImport.length > 0 ||
    astReqs.mustUseLoop ||
    astReqs.mustUseRecursion;

  if (hasAstChecks) {
    try {
      // Inject via globals to avoid any escaping issues with user code
      pyodide.globals.set("_user_code", code);
      pyodide.globals.set("_reqs_json", JSON.stringify(astReqs));
      const raw = await pyodide.runPythonAsync(AST_CHECK_SCRIPT);
      const astViolations: string[] = JSON.parse(raw);
      violations.push(...astViolations);
    } catch {
      // AST check failure is non-fatal — skip silently
    } finally {
      pyodide.globals.delete("_user_code");
      pyodide.globals.delete("_reqs_json");
    }
  }

  return violations;
}

export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window._pyodideInstance) {
      pyodideRef.current = window._pyodideInstance;
      setStatus("ready");
      return;
    }

    setStatus("loading");

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js";
    script.async = true;
    script.onload = async () => {
      try {
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/",
        });
        window._pyodideInstance = pyodide;
        pyodideRef.current = pyodide;
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);
  }, []);

  const runExercise = useCallback(
    async (code: string, exercise: Exercise): Promise<RunResult> => {
      const pyodide = pyodideRef.current;
      if (!pyodide) {
        return {
          status: "error",
          results: [],
          requirementErrors: [],
          output: "",
          error: "Pyodide is not ready yet.",
        };
      }

      // --- Step 1: Check requirements (before running any tests) ---
      const requirementErrors = exercise.requirements
        ? await checkRequirementsAST(pyodide, code, exercise.requirements)
        : [];

      // If requirements are not met, skip tests entirely
      if (requirementErrors.length > 0) {
        return {
          status: "failed",
          results: [],
          requirementErrors,
          output: "",
        };
      }

      // --- Step 2: Set up stdout/stderr capture ---
      let capturedOutput = "";
      pyodide.setStdout({ batched: (t: string) => { capturedOutput += t + "\n"; } });
      pyodide.setStderr({ batched: (t: string) => { capturedOutput += t + "\n"; } });

      // --- Step 3: Run setup code ---
      if (exercise.setupCode) {
        try {
          await pyodide.runPythonAsync(exercise.setupCode);
        } catch { /* ignore */ }
      }

      // --- Step 4: Load user code ---
      try {
        await pyodide.runPythonAsync(code);
      } catch (err) {
        return {
          status: "error",
          results: [],
          requirementErrors: [],
          output: capturedOutput,
          error: String(err),
        };
      }

      // --- Step 5: Run tests ---
      const results: TestResult[] = [];
      let allPassed = true;

      for (let i = 0; i < exercise.tests.length; i++) {
        const test = exercise.tests[i];
        let actualOutput = "";
        let passed = false;
        let error: string | undefined;

        try {
          const result = await pyodide.runPythonAsync(`str(${test.input})`);
          actualOutput = String(result).trim();
          passed = actualOutput === test.expectedOutput.trim();
        } catch (err) {
          error = String(err);
          passed = false;
        }

        if (!passed) allPassed = false;

        results.push({
          index: i,
          description: test.description,
          input: test.input,
          expectedOutput: test.expectedOutput,
          actualOutput,
          passed,
          error,
        });
      }

      return {
        status: allPassed ? "passed" : "failed",
        results,
        requirementErrors: [],
        output: capturedOutput,
      };
    },
    []
  );

  return { status, runExercise };
}
