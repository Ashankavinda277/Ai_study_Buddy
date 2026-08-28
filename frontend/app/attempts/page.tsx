"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Clock,
  Filter,
  Loader2,
  Search,
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import {
  ApiError,
  fetchAttempts,
  type AttemptSort,
  type AttemptSummary,
  type Difficulty,
} from "@/lib/api";

const DIFFICULTIES: { key: Difficulty | ""; label: string }[] = [
  { key: "", label: "All difficulties" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const SORTS: { key: AttemptSort; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "score", label: "Highest score" },
];

function performanceColor(level: string) {
  switch (level) {
    case "Excellent":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Good":
      return "bg-indigo-50 text-[#352599] border-indigo-200";
    case "Satisfactory":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

function HistoryContent() {
  const [attempts, setAttempts] = useState<AttemptSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [sort, setSort] = useState<AttemptSort>("newest");

  useEffect(() => {
    setAttempts(null);
    setError(null);
    const timeout = setTimeout(() => {
      fetchAttempts({
        topic: topic.trim() || undefined,
        difficulty: difficulty || undefined,
        sort,
      })
        .then(setAttempts)
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : "Failed to load quiz history.")
        );
    }, 250); // debounce the topic text input
    return () => clearTimeout(timeout);
  }, [topic, difficulty, sort]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fe] py-10 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Quiz History
          </h1>
          <p className="mt-1 text-sm text-slate-500">Review your past attempts and scores.</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Filter by topic..."
              className="w-full rounded-xl border border-slate-200 bg-[#fbfcfe] py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#352599] focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Filter className="h-4 w-4" />
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
              className="appearance-none rounded-xl border border-slate-200 bg-[#fbfcfe] py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-[#352599] focus:ring-4 focus:ring-indigo-500/10"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as AttemptSort)}
            className="appearance-none rounded-xl border border-slate-200 bg-[#fbfcfe] px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#352599] focus:ring-4 focus:ring-indigo-500/10"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {!attempts && !error && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#352599]" />
            <p className="text-sm text-slate-500">Loading history...</p>
          </div>
        )}

        {attempts && attempts.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-xs">
            <p className="text-sm text-slate-500">
              {topic || difficulty
                ? "No attempts match these filters."
                : "You haven't taken any quizzes yet."}
            </p>
            <Link
              href="/quizzes/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#352599] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2c1d85] transition-all"
            >
              Generate a quiz
            </Link>
          </div>
        )}

        {attempts && attempts.length > 0 && (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <Link
                key={attempt.id}
                href={`/attempts/${attempt.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:border-indigo-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{attempt.quiz_title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {attempt.document_filename}
                    {attempt.topic ? ` · ${attempt.topic}` : ""}
                    {" · "}
                    <span className="capitalize">{attempt.difficulty}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span>{new Date(attempt.completed_at).toLocaleString()}</span>
                    {attempt.time_taken !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {attempt.time_taken}s
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${performanceColor(
                      attempt.performance_level
                    )}`}
                  >
                    <Award className="h-3.5 w-3.5" />
                    {attempt.score_percentage}%
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#352599]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttemptsHistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
