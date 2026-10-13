"""Runs exercise variants with real CPython. Used only by the exercise gates.

Reads one JSON request on stdin, prints one JSON response on stdout.
Request:  {"setup": str|null, "tests": [{"input", "expected"}],
           "variants": {name: code}, "predict": {"code"}|null, "predictBase": name}
Response: {"python": "3.12.x",
           "variants": {name: {"loadError": str} | {"results": [bool]}},
           "predict": {"output": str} | null}

It mirrors lib/usePyodide.ts: setup, then the code, then str(eval(input)) per
test, compared with .strip(). A test that raises counts as failed.
"""
import ast
import contextlib
import io
import json
import platform
import sys


def load(code, setup):
    ns = {"__name__": "__exercise__"}
    if setup:
        exec(setup, ns)
    with contextlib.redirect_stdout(io.StringIO()):
        exec(code, ns)
    return ns


def run_variant(code, setup, tests):
    try:
        ns = load(code, setup)
    except BaseException as e:  # the learner's code may raise anything
        return {"loadError": f"{type(e).__name__}: {e}"}
    results = []
    for t in tests:
        try:
            got = str(eval(t["input"], ns)).strip()
            results.append(got == t["expected"].strip())
        except BaseException:
            results.append(False)
    return {"results": results}


def predict_output(code, base_code, setup):
    """Output of the last expression of `code`, or the exception class name."""
    try:
        ns = load(base_code, setup)
        tree = ast.parse(code)
        *head, last = tree.body
        if not isinstance(last, ast.Expr):
            return "<last statement is not an expression>"
        if head:
            exec(compile(ast.Module(head, []), "<predict>", "exec"), ns)
        return str(eval(compile(ast.Expression(last.value), "<predict>", "eval"), ns)).strip()
    except BaseException as e:
        return type(e).__name__


req = json.load(sys.stdin)
setup = req.get("setup")
out = {"python": platform.python_version(), "variants": {}, "predict": None}
for name, code in req["variants"].items():
    out["variants"][name] = run_variant(code, setup, req["tests"])
if req.get("predict"):
    base = req["variants"][req["predictBase"]]
    out["predict"] = {"output": predict_output(req["predict"]["code"], base, setup)}
json.dump(out, sys.stdout)
