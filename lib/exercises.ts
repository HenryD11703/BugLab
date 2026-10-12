import fs from "fs";
import path from "path";
import { exerciseSchema } from "./schema";
import { Exercise, ExerciseMeta } from "./types";

const EXERCISES_DIR = path.join(process.cwd(), "exercises");

export function getAllExerciseIds(): string[] {
  if (!fs.existsSync(EXERCISES_DIR)) return [];
  return fs
    .readdirSync(EXERCISES_DIR)
    .filter((f) => {
      const full = path.join(EXERCISES_DIR, f);
      return (
        fs.statSync(full).isDirectory() &&
        fs.existsSync(path.join(full, "exercise.json"))
      );
    })
    .sort();
}

/**
 * Reads and validates one exercise folder. Invalid content throws with the
 * file and the reasons, so a bad exercise fails the build instead of shipping.
 */
export function getExercise(id: string): Exercise | null {
  const jsonPath = path.join(EXERCISES_DIR, id, "exercise.json");
  if (!fs.existsSync(jsonPath)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  } catch (err) {
    throw new Error(`exercises/${id}/exercise.json is not valid JSON: ${String(err)}`);
  }

  const parsed = exerciseSchema.safeParse(raw);
  if (!parsed.success) {
    const reasons = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`exercises/${id}/exercise.json is invalid:\n${reasons}`);
  }

  const buggyPath = path.join(EXERCISES_DIR, id, "buggy.py");
  if (!fs.existsSync(buggyPath)) {
    throw new Error(`exercises/${id} has no buggy.py`);
  }
  const buggyCode = fs.readFileSync(buggyPath, "utf-8");

  const lineCount = buggyCode.replace(/\n$/, "").split("\n").length;
  for (const bug of parsed.data.locate?.bugs ?? []) {
    for (const line of bug.lines) {
      if (line > lineCount) {
        throw new Error(
          `exercises/${id}: locate line ${line} is past the end of buggy.py (${lineCount} lines)`
        );
      }
    }
  }

  return { ...parsed.data, id, buggyCode };
}

export function getAllExercises(): Exercise[] {
  return getAllExerciseIds()
    .map((id) => getExercise(id))
    .filter(Boolean) as Exercise[];
}

export function getAllExercisesMeta(): ExerciseMeta[] {
  return getAllExercises().map(({ id, title, difficulty, tags }) => ({
    id,
    title,
    difficulty,
    tags,
  }));
}
