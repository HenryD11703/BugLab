// Writes public/solutions/<id>.json from each exercise's solution.py.
// The Hints panel fetches one of these only after it unlocks "Show solution",
// so solutions are not part of any page's payload. Runs before dev and build.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exercises = path.join(root, "exercises");
const out = path.join(root, "public", "solutions");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

let count = 0;
for (const id of fs.readdirSync(exercises).sort()) {
  const file = path.join(exercises, id, "solution.py");
  if (!fs.existsSync(file)) continue;
  fs.writeFileSync(path.join(out, `${id}.json`), JSON.stringify({ code: fs.readFileSync(file, "utf-8") }));
  count++;
}
console.log(`solutions: wrote ${count} files to public/solutions`);
