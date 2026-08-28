"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Award, ArrowLeft, RotateCcw, AlertCircle, Loader2, Sparkles } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { QuizNav } from "@/components/quiz-nav";
import { ApiError, fetchAttempt, type AttemptDetail } from "@/lib/api";

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"];

function performanceBadge(level: string) {
  switch (level) {
    case "Excellent":
      return {
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        scoreColor: "text-emerald-600",
      };
    case "Good":
      return {
        badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        scoreColor: "text-[#352599]",
      };
    case "Satisfactory":
      return {
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        scoreColor: "text-amber-600",
      };
    default:
      return {
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        scoreColor: "text-rose-600",
      };
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
      <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
        <AppSidebar active="quiz" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <QuizNav />
          <main className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">Error Loading Results</h2>
              <p className="text-sm text-slate-500 mb-6">{error}</p>
              <Link
                href="/attempts"
                className="rounded-xl bg-[#352599] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#2c1d85] transition-all inline-block"
              >
                Back to Quiz History
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
        <AppSidebar active="quiz" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <QuizNav />
          <main className="flex flex-1 flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#352599]" />
            <p className="text-sm font-medium text-slate-500">Grading & loading performance summary...</p>
          </main>
        </div>
      </div>
    );
  }

  const perf = performanceBadge(attempt.performance_level);

  return (
    <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
      <AppSidebar active="quiz" />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <QuizNav />

        <main className="flex-1 py-10 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {/* Top Breadcrumb / Title */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {attempt.quiz_title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Performance Summary & Question Breakdown
              </p>
            </div>

            {/* Score Hero Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-indigo-950/5 p-8 text-center relative overflow-hidden mb-8">
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Overall Score
                </span>
                <div className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${perf.scoreColor}`}>
                  {attempt.score_percentage}%
                </div>
                
                <div className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs sm:text-sm font-semibold ${perf.badgeBg}`}>
                  <Award className="w-4 h-4" />
                  <span>{attempt.performance_level}</span>
                </div>

                {/* Quick Stats Grid */}
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-6 border-t border-slate-100">
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                    <div className="flex items-center justify-center gap-1 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </div>
                    <div className="text-xl font-bold text-emerald-800 mt-1">{attempt.correct_count}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100/80">
                    <div className="flex items-center justify-center gap-1 text-rose-700 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </div>
                    <div className="text-xl font-bold text-rose-800 mt-1">{attempt.incorrect_count}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-slate-500 text-xs font-semibold">Total Questions</div>
                    <div className="text-xl font-bold text-slate-800 mt-1">{attempt.total_questions}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </div>
                    <div className="text-xl font-bold text-slate-800 mt-1">
                      {attempt.time_taken !== null ? `${attempt.time_taken}s` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Feedback */}
            {attempt.ai_feedback && (
              <div className="mb-8 rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-7 shadow-sm">
                <div className="flex items-center gap-2 text-[#352599] font-semibold text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#352599] text-white shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span>Personalized Feedback</span>
                </div>
                <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-indigo-950/90">
                  {attempt.ai_feedback}
                </p>
              </div>
            )}

            {/* Detailed Question Review */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Question Review</h2>
              <span className="text-xs text-slate-500 font-medium">
                {attempt.correct_count} of {attempt.total_questions} correct
              </span>
            </div>

            <div className="space-y-4">
              {attempt.questions.map((q, index) => (
                <div
                  key={q.question_id}
                  className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-all ${
                    q.is_correct
                      ? "border-emerald-200/90"
                      : "border-rose-200/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                      {index + 1}. {q.question}
                    </p>
                    {q.is_correct ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="mt-4 space-y-2">
                    {OPTION_KEYS.map((key, optIndex) => {
                      const isCorrectOption = optIndex === q.correct_answer;
                      const isSelectedOption = optIndex === q.selected_answer;
                      
                      let optionStyle = "border-slate-200/80 bg-slate-50/40 text-slate-700";
                      if (isCorrectOption) {
                        optionStyle = "border-emerald-300 bg-emerald-50/60 text-emerald-900 font-medium";
                      } else if (isSelectedOption && !isCorrectOption) {
                        optionStyle = "border-rose-300 bg-rose-50/60 text-rose-900";
                      }

                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm transition-all ${optionStyle}`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              isCorrectOption
                                ? "bg-emerald-600 text-white"
                                : isSelectedOption
                                ? "bg-rose-500 text-white"
                                : "border border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            {OPTION_LABELS[optIndex]}
                          </span>
                          <span className="flex-1">{q[key]}</span>
                          {isCorrectOption && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              Correct Answer
                            </span>
                          )}
                          {isSelectedOption && !isCorrectOption && (
                            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                              Your Answer
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {q.selected_answer === null && (
                      <p className="text-xs text-amber-600 font-medium pl-1">
                        Unanswered
                      </p>
                    )}
                  </div>

                  {/* AI Explanation Box */}
                  {q.explanation && (
                    <div className="mt-4 rounded-xl bg-indigo-50/60 border border-indigo-100/80 p-3.5 text-xs sm:text-sm text-indigo-950 leading-relaxed">
                      <span className="font-semibold text-[#352599] block mb-1">Explanation:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/attempts"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quiz History</span>
              </Link>

              <Link
                href="/quizzes/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#352599] hover:bg-[#2c1d85] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Take Another Quiz</span>
              </Link>
            </div>
          </div>
        </main>
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
