import { describe, expect, it } from "vitest";
import { getAllExerciseIds } from "@/lib/exercises";

describe("test pipeline", () => {
  it("resolves the @ alias and finds the exercises on disk", () => {
    expect(getAllExerciseIds().length).toBeGreaterThanOrEqual(20);
  });
});
