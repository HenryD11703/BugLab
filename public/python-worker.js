/* BugLab Python worker. Runs the learner's code in Pyodide, off the main thread.
 *
 * Protocol (see lib/runner.ts):
 *   in:  { type: "init" }
 *        { type: "run", id, payload: { code, setup, tests: [{input, expected}] } }
 *   out: { type: "ready", python }
 *        { type: "init-error", message }
 *        { type: "result", id, result }
 *
 * Every run executes in a brand new namespace, so nothing a previous run
 * defined can make a later run pass. A run that never ends is stopped by the
 * page, which terminates this worker and starts a new one.
 */
"use strict";

// Pinned: Pyodide 0.27.x ships CPython 3.12, the version the CI gates use.
var PYODIDE_VERSION = "v0.27.4";
var BASE = "https://cdn.jsdelivr.net/pyodide/" + PYODIDE_VERSION + "/full/";

var RUNNER_PY = [
  "import contextlib, json, linecache, traceback",
  "",
  "MAX_OUTPUT = 10000",
  "",
  "class _Capped:",
  "    def __init__(self):",
  "        self.parts, self.size, self.truncated = [], 0, False",
  "    def write(self, s):",
  "        room = MAX_OUTPUT - self.size",
  "        if room > 0:",
  "            self.parts.append(s[:room])",
  "            self.size += min(len(s), room)",
  "        if len(s) > room:",
  "            self.truncated = True",
  "        return len(s)",
  "    def flush(self):",
  "        pass",
  "    def text(self):",
  "        t = ''.join(self.parts)",
  "        return t + '\\n... output truncated' if self.truncated else t",
  "",
  "def _describe(exc, own_files):",
  "    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in own_files]",
  "    line = None",
  "    for f in frames:",
  "        if f.filename == 'solution.py':",
  "            line = f.lineno",
  "    if isinstance(exc, SyntaxError) and exc.filename == 'solution.py':",
  "        line = exc.lineno",
  "    parts = []",
  "    if frames:",
  "        parts.append('Traceback (most recent call last):\\n')",
  "        parts.extend(traceback.StackSummary.from_list(frames).format())",
  "    parts.extend(traceback.format_exception_only(type(exc), exc))",
  "    return {",
  "        'kind': type(exc).__name__,",
  "        'message': str(exc),",
  "        'line': line,",
  "        'traceback': ''.join(parts).rstrip(),",
  "    }",
  "",
  "def run(payload_json):",
  "    p = json.loads(payload_json)",
  "    ns = {'__name__': '__main__'}",
  "    out = _Capped()",
  "    result = {'stdout': '', 'load': None, 'tests': []}",
  "    own = ('solution.py', 'setup.py')",
  "    linecache.cache['solution.py'] = (len(p['code']), None, p['code'].splitlines(True), 'solution.py')",
  "    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):",
  "        if p.get('setup'):",
  "            try:",
  "                exec(compile(p['setup'], 'setup.py', 'exec'), ns)",
  "            except BaseException as e:",
  "                result['load'] = dict(_describe(e, own), phase='setup')",
  "        if result['load'] is None:",
  "            try:",
  "                exec(compile(p['code'], 'solution.py', 'exec'), ns)",
  "            except BaseException as e:",
  "                result['load'] = dict(_describe(e, own), phase='code')",
  "        if result['load'] is None:",
  "            for t in p['tests']:",
  "                try:",
  "                    got = str(eval(compile(t['input'], '<test>', 'eval'), ns)).strip()",
  "                    result['tests'].append({'actual': got, 'passed': got == t['expected'].strip(), 'error': None})",
  "                except BaseException as e:",
  "                    result['tests'].append({'actual': '', 'passed': False, 'error': _describe(e, own)})",
  "    result['stdout'] = out.text()",
  "    return json.dumps(result)",
].join("\n");

var runFn = null;

function init() {
  try {
    importScripts(BASE + "pyodide.js");
  } catch {
    postMessage({ type: "init-error", message: "Could not download the Python runtime (" + BASE + "pyodide.js)." });
    return;
  }
  loadPyodide({ indexURL: BASE })
    .then(function (pyodide) {
      pyodide.runPython(RUNNER_PY);
      runFn = pyodide.globals.get("run");
      var python = pyodide.runPython("import sys; sys.version.split()[0]");
      postMessage({ type: "ready", python: python });
    })
    .catch(function (e) {
      postMessage({ type: "init-error", message: "The Python runtime failed to start: " + String((e && e.message) || e) });
    });
}

onmessage = function (event) {
  var msg = event.data;
  if (msg.type === "init") {
    init();
  } else if (msg.type === "run") {
    if (!runFn) {
      postMessage({ type: "init-error", message: "The Python runtime is not ready." });
      return;
    }
    var result;
    try {
      result = JSON.parse(runFn(JSON.stringify(msg.payload)));
    } catch (e) {
      result = {
        stdout: "",
        load: { kind: "RunnerError", message: String((e && e.message) || e), line: null, traceback: String((e && e.message) || e), phase: "code" },
        tests: [],
      };
    }
    postMessage({ type: "result", id: msg.id, result: result });
  }
};
