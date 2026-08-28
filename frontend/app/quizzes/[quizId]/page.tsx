"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flag, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { ApiError, fetchQuiz, submitQuiz, type QuizPublic } from "@/lib/api";

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"];

function QuizPlayer({ quizId }: { quizId: number }) {
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
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
      <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fe] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Quiz</h2>
          <p className="text-sm text-slate-500 mb-6">{loadError}</p>
          <button
            onClick={() => router.push("/quizzes/new")}
            className="rounded-xl bg-[#352599] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#2c1d85] transition-all"
          >
            Create New Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fe] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#352599]" />
        <p className="text-sm font-medium text-slate-500">Loading your quiz session...</p>
      </div>
    );
  }

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const selected = answers[currentQuestion.id];
  const isFlagged = Boolean(flaggedQuestions[currentQuestion.id]);

  function selectAnswer(questionId: number, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  function toggleFlag(questionId: number) {
    setFlaggedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
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

  const topicLabel = quiz.topic || quiz.title || "STUDY SESSION";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fe] py-8 sm:py-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {/* Top Header & Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-slate-500 mb-2">
            <span className="uppercase text-slate-600 font-bold tracking-widest truncate max-w-[280px] sm:max-w-md">
              {topicLabel}
            </span>
            <span className="text-slate-700 font-semibold shrink-0">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-[#352599] transition-all duration-300 ease-out"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Nav Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {quiz.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;
              const isQFlagged = flaggedQuestions[q.id];

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative h-7 w-7 sm:h-8 sm:w-8 rounded-full text-xs font-semibold transition-all duration-150 flex items-center justify-center cursor-pointer ${
                    isCurrent
                      ? "bg-[#352599] text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-300"
                      : isAnswered
                      ? "bg-indigo-100 text-[#352599] hover:bg-indigo-200"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {idx + 1}
                  {isQFlagged && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Area */}
        <div className="mt-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight leading-snug max-w-2xl mx-auto">
            {currentQuestion.question}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 text-center font-normal">
            Select the most accurate description below.
          </p>
        </div>

        {/* Option Cards */}
        <div className="space-y-3.5 max-w-2xl mx-auto">
          {OPTION_KEYS.map((key, index) => {
            const isSelected = selected === index;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectAnswer(currentQuestion.id, index)}
                className={`group flex w-full items-center gap-4 rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-2 border-[#352599] bg-[#f7f8ff] shadow-sm"
                    : "border border-slate-200/90 bg-white hover:border-indigo-200 hover:bg-slate-50/50 hover:shadow-xs"
                }`}
              >
                {/* Badge A/B/C/D */}
                <span
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isSelected
                      ? "border-transparent bg-[#352599] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-500 group-hover:border-slate-300 group-hover:text-slate-700"
                  }`}
                >
                  {OPTION_LABELS[index]}
                </span>

                {/* Option Text */}
                <span
                  className={`text-sm sm:text-[15px] font-normal leading-relaxed transition-colors ${
                    isSelected ? "text-slate-900 font-medium" : "text-slate-700"
                  }`}
                >
                  {currentQuestion[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions Bar */}
        <div className="mt-10 flex items-center justify-between max-w-2xl mx-auto pt-4 border-t border-slate-200/60">
          {/* Flag for Review */}
          <button
            type="button"
            onClick={() => toggleFlag(currentQuestion.id)}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer py-2 px-3 rounded-xl ${
              isFlagged
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${isFlagged ? "fill-amber-500 text-amber-500" : ""}`} />
            <span>{isFlagged ? "Flagged for Review" : "Flag for Review"}</span>
          </button>

          {/* Prev / Next / Submit */}
          <div className="flex items-center gap-2.5">
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[#352599] hover:bg-[#2c1d85] active:scale-[0.99] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Submit Quiz</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs ${
                  selected !== undefined
                    ? "bg-[#352599] hover:bg-[#2c1d85] text-white shadow-md shadow-indigo-900/20"
                    : "bg-[#eef1f8] hover:bg-[#e2e7f4] text-slate-700"
                }`}
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {submitError && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 max-w-2xl mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Unanswered Questions Confirmation Modal */}
        {confirmingSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs px-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {unansweredCount} Unanswered Question{unansweredCount === 1 ? "" : "s"}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Are you sure you want to finish? You will not be able to change your answers once submitted.
              </p>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmingSubmit(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Keep Reviewing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingSubmit(false);
                    doSubmit();
                  }}
                  className="rounded-xl bg-[#352599] hover:bg-[#2c1d85] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition-all cursor-pointer"
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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

