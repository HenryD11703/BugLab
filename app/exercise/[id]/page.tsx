import { notFound } from "next/navigation";
import ExerciseView from "@/components/exercise/ExerciseView";
import { getAllExerciseIds, getExercise } from "@/lib/exercises";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getAllExerciseIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) return { title: "Not found — BugLab" };
  // The description says what the code should do, never where the bug is.
  return {
    title: `${exercise.title} — BugLab`,
    description: `A broken Python function to read, understand and fix. ${exercise.difficulty} · ${exercise.tags.join(", ")}.`,
  };
}

export default async function ExercisePage({ params }: Props) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();

  const ids = getAllExerciseIds();
  const index = ids.indexOf(id);
  const nextId = ids[index + 1];
  const nextExercise = nextId ? getExercise(nextId) : null;

  return (
    <ExerciseView
      exercise={exercise}
      position={{ n: index + 1, total: ids.length }}
      next={nextExercise ? { id: nextExercise.id, title: nextExercise.title } : null}
    />
  );
}
