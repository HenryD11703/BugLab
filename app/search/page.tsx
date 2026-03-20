import { getAllExercises } from "@/lib/exercises";
import SearchClient from "@/components/SearchClient";

export const metadata = {
  title: "Search — BugLab",
  description: "Search and filter Python debugging exercises by title, concept, difficulty, or tag.",
};

export default function SearchPage() {
  const exercises = getAllExercises().map((ex) => ({
    id: ex.id,
    title: ex.title,
    difficulty: ex.difficulty,
    tags: ex.tags,
    description: ex.description,
    testCount: ex.tests.length,
  }));

  return <SearchClient exercises={exercises} />;
}
