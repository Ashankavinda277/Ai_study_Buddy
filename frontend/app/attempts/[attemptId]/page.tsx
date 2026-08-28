"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, fetchAttempt, type AttemptDetail } from "@/lib/api";

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"];

function performanceColor(level: string) {
  switch (level) {
    case "Excellent":
      return "text-green-600 dark:text-green-400";
    case "Good":
      return "text-blue-600 dark:text-blue-400";
    case "Satisfactory":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-red-600 dark:text-red-400";
  }
}

function ResultsContent({ attemptId }: { attemptId: number }) {
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttempt(attemptId)
      .then(setAttempt)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load results.")
      );
  }, [attemptId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="rounded bg-red-50 px-4 py-3 text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{attempt.quiz_title}</h1>

      <div className="mt-6 rounded-lg border border-black/10 p-6 text-center dark:border-white/10">
        <p className={`text-4xl font-bold ${performanceColor(attempt.performance_level)}`}>
          {attempt.score_percentage}%
        </p>
        <p className={`mt-1 font-medium ${performanceColor(attempt.performance_level)}`}>
          {attempt.performance_level}
        </p>
        <div className="mt-4 flex justify-center gap-8 text-sm text-zinc-500">
          <span>{attempt.correct_count} correct</span>
          <span>{attempt.incorrect_count} incorrect</span>
          <span>{attempt.total_questions} total</span>
          {attempt.time_taken !== null && <span>{attempt.time_taken}s</span>}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Question review</h2>
      <div className="mt-4 space-y-4">
        {attempt.questions.map((q, index) => (
          <div
            key={q.question_id}
            className={`rounded-lg border p-4 ${
              q.is_correct
                ? "border-green-200 dark:border-green-900"
                : "border-red-200 dark:border-red-900"
            }`}
          >
            <p className="font-medium">
              {index + 1}. {q.question}
            </p>

            <div className="mt-3 space-y-2">
              {OPTION_KEYS.map((key, optIndex) => {
                const isCorrectOption = optIndex === q.correct_answer;
                const isSelectedOption = optIndex === q.selected_answer;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                      isCorrectOption
                        ? "border-green-400 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                        : isSelectedOption
                        ? "border-red-400 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                        : "border-black/10 dark:border-white/10"
                    }`}
                  >
                    <span className="font-medium">{OPTION_LABELS[optIndex]}</span>
                    <span>{q[key]}</span>
                    {isCorrectOption && (
                      <span className="ml-auto text-xs">Correct answer</span>
                    )}
                    {isSelectedOption && !isCorrectOption && (
                      <span className="ml-auto text-xs">Your answer</span>
                    )}
                  </div>
                );
              })}
              {q.selected_answer === null && (
                <p className="text-xs text-zinc-500">You left this question unanswered.</p>
              )}
            </div>

            {q.explanation && (
              <p className="mt-3 rounded bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="rounded-full border border-black/15 px-6 py-3 text-sm dark:border-white/15"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default function AttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = Number(params.attemptId);

  return (
    <ProtectedRoute>
      <ResultsContent attemptId={attemptId} />
    </ProtectedRoute>
  );
}
