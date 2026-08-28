"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, fetchQuiz, submitQuiz, type QuizPublic } from "@/lib/api";

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"];

function QuizPlayer({ quizId }: { quizId: number }) {
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    fetchQuiz(quizId)
      .then(setQuiz)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Failed to load quiz.")
      );
  }, [quizId]);

  // Warn before closing/refreshing the tab with unsaved answers.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (Object.keys(answers).length > 0) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [answers]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="rounded bg-red-50 px-4 py-3 text-red-600 dark:bg-red-950 dark:text-red-400">
          {loadError}
        </p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading quiz...</p>
      </div>
    );
  }

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const selected = answers[currentQuestion.id];

  function selectAnswer(questionId: number, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  async function doSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const timeTaken = Math.round((Date.now() - startedAt) / 1000);
      const payload = {
        answers: quiz!.questions.map((q) => ({
          question_id: q.id,
          selected_answer: answers[q.id] ?? null,
        })),
        time_taken: timeTaken,
      };
      const result = await submitQuiz(quiz!.id, payload);
      router.push(`/attempts/${result.attempt_id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit quiz.");
      setSubmitting(false);
    }
  }

  function handleSubmitClick() {
    if (unansweredCount > 0) {
      setConfirmingSubmit(true);
      return;
    }
    doSubmit();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{quiz.title}</h1>
      <p className="mt-1 text-sm capitalize text-zinc-500">
        {quiz.difficulty} &middot; {totalQuestions} questions
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quiz.questions.map((q, index) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = index === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-8 w-8 rounded-full text-sm font-medium ${
                isCurrent
                  ? "bg-foreground text-background"
                  : isAnswered
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                  : "border border-black/15 text-zinc-500 dark:border-white/15"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-black/10 p-6 dark:border-white/10">
        <p className="text-lg font-medium">{currentQuestion.question}</p>

        <div className="mt-4 space-y-3">
          {OPTION_KEYS.map((key, index) => (
            <button
              key={key}
              type="button"
              onClick={() => selectAnswer(currentQuestion.id, index)}
              className={`flex w-full items-center gap-3 rounded border px-4 py-3 text-left transition-colors ${
                selected === index
                  ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                  : "border-black/15 hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/[.04]"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/20 text-xs font-medium dark:border-white/20">
                {OPTION_LABELS[index]}
              </span>
              <span>{currentQuestion[key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={submitting}
            className="rounded bg-foreground px-6 py-2 text-sm text-background disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
            className="rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Next
          </button>
        )}
      </div>

      {submitError && (
        <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {submitError}
        </p>
      )}

      {confirmingSubmit && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg border border-black/10 bg-background p-6 shadow-lg dark:border-white/10">
            <p className="font-medium">
              {unansweredCount} question{unansweredCount === 1 ? "" : "s"} unanswered
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Submit anyway? You won&apos;t be able to change your answers after submitting.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingSubmit(false)}
                className="rounded border border-black/15 px-4 py-2 text-sm dark:border-white/15"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingSubmit(false);
                  doSubmit();
                }}
                className="rounded bg-foreground px-4 py-2 text-sm text-background"
              >
                Submit anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = Number(params.quizId);

  return (
    <ProtectedRoute>
      <QuizPlayer quizId={quizId} />
    </ProtectedRoute>
  );
}
