import { getExercise, getAllExerciseIds } from "@/lib/exercises";
import ExerciseClient from "@/components/ExerciseClient";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getAllExerciseIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) return { title: "Not Found — BugLab" };
  return {
    title: `${exercise.title} — BugLab`,
    description: exercise.description.slice(0, 160),
  };
}

export default async function ExercisePage({ params }: Props) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();

  return <ExerciseClient exercise={exercise} />;
}
