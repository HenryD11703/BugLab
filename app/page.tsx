import CodeBlock from "@/components/CodeBlock";
import ExerciseTable, { type ExerciseRow } from "@/components/home/ExerciseTable";
import SiteHeader from "@/components/SiteHeader";
import { getAllExercises } from "@/lib/exercises";
import { STEPS } from "@/lib/progress-model";

const SAMPLE = `def sum_list(numbers):
    total = 0
    for i in range(len(numbers) - 1):
        total += numbers[i]
    return total
`;

export default function HomePage() {
  const rows: ExerciseRow[] = getAllExercises().map((e) => ({
    id: e.id,
    title: e.title,
    difficulty: e.difficulty,
    tags: e.tags.slice(0, 2),
    concept: e.concept,
    steps: STEPS.filter((s) => e[s]),
  }));

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="wrap grid">
            <div>
              <h1>
                Read the code.
                <br />
                Find the <span className="bugword">bug</span>.
              </h1>
              <p className="lede">
                Short, broken Python functions. <strong>Predict</strong> what they do, <strong>point</strong> at the bug,{" "}
                <strong>explain</strong> it, then <strong>fix</strong> it. Runs in your browser. No account.
              </p>
            </div>
            <div className="pointer">
              <span className="label">The kind of thing you will find</span>
              <CodeBlock code={SAMPLE} label="Example: a function with a bug on line 3" bug={[3]} pointAt={[{ line: 3, from: 19, to: 35 }]} />
              <p className="pointer-cap">sum_list([1, 2, 3]) returns 3. Why?</p>
            </div>
          </div>
        </section>
        <ExerciseTable rows={rows} />
      </main>
      <footer className="site">
        <div className="wrap">
          <span>BugLab · open source · MIT</span>
          <span>Python runs in your browser. Nothing leaves it.</span>
        </div>
      </footer>
    </>
  );
}
