import fs from "fs";
import path from "path";
import { Exercise, ExerciseMeta, RawExerciseJson } from "./types";

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

export function getExercise(id: string): Exercise | null {
  const filePath = path.join(EXERCISES_DIR, id, "exercise.json");
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as RawExerciseJson;

  // Prefer buggy.py on disk; fall back to buggyCode in JSON (backward compat).
  const buggyPath = path.join(EXERCISES_DIR, id, "buggy.py");
  let buggyCode: string;
  if (fs.existsSync(buggyPath)) {
    buggyCode = fs.readFileSync(buggyPath, "utf-8");
  } else if (typeof data.buggyCode === "string") {
    buggyCode = data.buggyCode;
  } else {
    throw new Error(
      `Exercise "${id}" has no buggy.py and no buggyCode in exercise.json`
    );
  }

  return { ...data, id, buggyCode } as Exercise;
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
