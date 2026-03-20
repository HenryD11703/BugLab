import { getAllExercises } from "@/lib/exercises";
import ExerciseList from "@/components/ExerciseList";

export default function HomePage() {
  const exercises = getAllExercises();

  // Pass only what the client needs — no buggyCode, no hints, no full tests.
  // At 1000 exercises this stays ~200KB and filters instantly client-side.
  const exerciseMetas = exercises.map((ex) => ({
    id: ex.id,
    title: ex.title,
    difficulty: ex.difficulty,
    tags: ex.tags,
    description: ex.description.slice(0, 200),
    testCount: ex.tests.length,
  }));

  const counts = {
    total: exercises.length,
    easy: exercises.filter((e) => e.difficulty === "easy").length,
    medium: exercises.filter((e) => e.difficulty === "medium").length,
    hard: exercises.filter((e) => e.difficulty === "hard").length,
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Hero */}
      <div className="border-b border-[#0A0A0A]">
        <div className="max-w-5xl mx-auto px-8">
          {/* Nav */}
          <nav className="flex items-center justify-between h-12 border-b border-[#E0E0E0]">
            <span
              className="text-[10px] tracking-[0.2em] uppercase text-[#0A0A0A] font-bold"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              BugLab
            </span>
            <a
              href="https://github.com/HenryD11703/BugLab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B] hover:text-[#E63329] transition-colors"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              GitHub ↗
            </a>
          </nav>

          {/* Hero content */}
          <div className="py-14 pb-12">
            <div className="mb-4">
              <span
                className="text-[10px] tracking-[0.2em] uppercase text-[#E63329]"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                Open Source
              </span>
            </div>
            <h1
              className="text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.9] tracking-[-0.04em] text-[#0A0A0A] mb-5"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Bug<span className="text-[#E63329]">Lab</span>
            </h1>
            <div className="max-w-lg">
              <p
                className="text-lg text-[#3A3A3A] leading-relaxed mb-1.5"
                style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              >
                Not another LeetCode.
              </p>
              <p
                className="text-base text-[#6B6B6B] leading-relaxed"
                style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
              >
                BugLab challenges your ability to{" "}
                <strong className="text-[#0A0A0A] font-semibold">write</strong>{" "}
                and{" "}
                <strong className="text-[#0A0A0A] font-semibold">review</strong>{" "}
                code — not just memorize algorithms. Each exercise starts with a
                broken snippet. You fix it.
              </p>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-8 mt-8 pt-7 border-t border-[#E0E0E0]">
              {[
                { label: "Exercises", value: counts.total },
                { label: "Easy", value: counts.easy },
                { label: "Medium", value: counts.medium },
                { label: "Hard", value: counts.hard },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div
                    className="text-2xl font-bold text-[#0A0A0A] tracking-[-0.02em]"
                    style={{
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                    }}
                  >
                    {value}
                  </div>
                  <div
                    className="text-[10px] tracking-[0.15em] uppercase text-[#6B6B6B]"
                    style={{ fontFamily: "var(--font-space-mono), monospace" }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exercise list — client component handles search + filter */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        {exercises.length === 0 ? (
          <div className="text-center py-20">
            <p
              className="text-[#CCCCCC] text-sm tracking-widest uppercase"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              No exercises yet. Add one to{" "}
              <code className="bg-[#F0F0F0] px-1">exercises/</code>
            </p>
          </div>
        ) : (
          <ExerciseList exercises={exerciseMetas} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E0E0E0] mt-10">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#CCCCCC]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            BugLab — Open Source
          </span>
          <span
            className="text-[10px] tracking-[0.15em] uppercase text-[#CCCCCC]"
            style={{ fontFamily: "var(--font-space-mono), monospace" }}
          >
            Python runs in your browser via Pyodide
          </span>
        </div>
      </footer>
    </div>
  );
}
