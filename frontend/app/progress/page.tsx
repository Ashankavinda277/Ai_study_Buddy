"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import {
  ApiError,
  fetchProgressSummary,
  fetchTopicPerformance,
  type ProgressSummary,
  type TopicPerformance,
} from "@/lib/api";

const INDIGO = "#352599";
const EMERALD = "#10b981";
const ROSE = "#f43f5e";
const AMBER = "#f59e0b";

function classificationColor(classification: string) {
  switch (classification) {
    case "Strong":
      return EMERALD;
    case "Average":
      return AMBER;
    default:
      return ROSE;
  }
}

function classificationBadge(classification: string) {
  switch (classification) {
    case "Strong":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Average":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

function ProgressCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ProgressContent() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [topics, setTopics] = useState<TopicPerformance[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProgressSummary(), fetchTopicPerformance()])
      .then(([summaryData, topicsData]) => {
        setSummary(summaryData);
        setTopics(topicsData);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load your progress.")
      );
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
        <AppSidebar active="progress" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <header className="flex items-center justify-between border-b border-indigo-100 bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-900" />
              <h1 className="font-serif text-lg font-semibold text-indigo-950">My Progress</h1>
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">Couldn&apos;t load progress</h2>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!summary || !topics) {
    return (
      <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
        <AppSidebar active="progress" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <header className="flex items-center justify-between border-b border-indigo-100 bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-900" />
              <h1 className="font-serif text-lg font-semibold text-indigo-950">My Progress</h1>
            </div>
          </header>
          <main className="flex flex-1 flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#352599]" />
            <p className="text-sm font-medium text-slate-500">Loading your progress...</p>
          </main>
        </div>
      </div>
    );
  }

  if (summary.total_quizzes_completed === 0) {
    return (
      <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
        <AppSidebar active="progress" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <header className="flex items-center justify-between border-b border-indigo-100 bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-900" />
              <h1 className="font-serif text-lg font-semibold text-indigo-950">My Progress</h1>
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
              <Sparkles className="w-10 h-10 text-[#352599] mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">No quizzes yet</h2>
              <p className="text-sm text-slate-500 mb-6">
                Take a quiz to start building your learning progress dashboard.
              </p>
              <Link
                href="/quizzes/new"
                className="rounded-xl bg-[#352599] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#2c1d85] transition-all inline-block"
              >
                Generate a quiz
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }


  const correctCount = Math.round(
    (summary.total_questions_answered * summary.correct_answer_percentage) / 100
  );
  const incorrectCount = summary.total_questions_answered - correctCount;

  const trendData = summary.score_trend.map((point, index) => ({
    name: `#${index + 1}`,
    score: point.score_percentage,
  }));

  const topicBarData = [...topics]
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((t) => ({ topic: t.topic, accuracy: t.accuracy, classification: t.classification }));

  const doughnutData = [
    { name: "Correct", value: correctCount, color: EMERALD },
    { name: "Incorrect", value: incorrectCount, color: ROSE },
  ];

  return (
    <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
      <AppSidebar active="progress" />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-indigo-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-900" />
            <h1 className="font-serif text-lg font-semibold text-indigo-950">My Progress</h1>
          </div>
        </header>


        <main className="flex-1 py-10 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Learning Progress
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                A summary of how you&apos;re doing across every quiz you&apos;ve taken.
              </p>
            </div>


            {/* Progress cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ProgressCard
                icon={<Trophy className="h-4 w-4" />}
                label="Average score"
                value={`${summary.average_score}%`}
              />
              <ProgressCard
                icon={<Award className="h-4 w-4" />}
                label="Best score"
                value={`${summary.best_score}%`}
              />
              <ProgressCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Recent score"
                value={summary.recent_score !== null ? `${summary.recent_score}%` : "—"}
              />
              <ProgressCard
                icon={<Target className="h-4 w-4" />}
                label="Quizzes completed"
                value={String(summary.total_quizzes_completed)}
              />
            </div>

            {/* Strongest / weakest topic */}
            {(summary.strongest_topic || summary.weakest_topic) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {summary.strongest_topic && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
                    <span className="font-semibold text-emerald-800">Strongest topic: </span>
                    <span className="text-emerald-700">{summary.strongest_topic}</span>
                  </div>
                )}
                {summary.weakest_topic && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm">
                    <span className="font-semibold text-rose-800">Needs work: </span>
                    <span className="text-rose-700">{summary.weakest_topic}</span>
                  </div>
                )}
              </div>
            )}

            {/* Score trend line chart */}
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-700">Score trend</h2>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={INDIGO}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: INDIGO }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {/* Performance by topic bar chart */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-semibold text-slate-700">Performance by topic</h2>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topicBarData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        width={90}
                        tick={{ fontSize: 11, fill: "#475569" }}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, "Accuracy"]} />
                      <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                        {topicBarData.map((entry) => (
                          <Cell key={entry.topic} fill={classificationColor(entry.classification)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Correct vs incorrect doughnut */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-semibold text-slate-700">Correct vs incorrect</h2>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={doughnutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {doughnutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Weak topic list */}
            {topics.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-semibold text-slate-700">Topics to review</h2>
                <div className="mt-4 space-y-2">
                  {topics.map((topic) => (
                    <div
                      key={topic.topic}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{topic.topic}</p>
                        <p className="text-xs text-slate-400">
                          {topic.total_correct}/{topic.total_attempted} correct
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classificationBadge(
                          topic.classification
                        )}`}
                      >
                        {topic.classification} · {topic.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent attempts */}
            <div className="mt-6 mb-10 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Recent attempts</h2>
                <Link
                  href="/attempts"
                  className="flex items-center gap-1 text-xs font-semibold text-[#352599] hover:underline"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {summary.recent_attempts.map((attempt) => (
                  <Link
                    key={attempt.id}
                    href={`/attempts/${attempt.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 hover:border-indigo-200 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {attempt.quiz_title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(attempt.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#352599]">
                      {attempt.score_percentage}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <ProtectedRoute>
      <ProgressContent />
    </ProtectedRoute>
  );
}

