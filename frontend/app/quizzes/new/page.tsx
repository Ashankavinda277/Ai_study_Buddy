"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { FileText, Search, Sparkles, ChevronDown, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { QuizNav } from "@/components/quiz-nav";
import {
  ApiError,
  fetchAvailableDocuments,
  generateQuiz,
  type AvailableDocument,
  type Difficulty,
  type QuestionCount,
  type QuizGenerateResponse,
} from "@/lib/api";

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const QUESTION_COUNTS: QuestionCount[] = [5, 10, 15];

function GenerateQuizForm() {
  const [documents, setDocuments] = useState<AvailableDocument[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(5);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizGenerateResponse | null>(null);

  useEffect(() => {
    fetchAvailableDocuments()
      .then((docs) => {
        setDocuments(docs);
        const firstReady = docs.find((d) => d.status === "ready");
        if (firstReady) setDocumentId(firstReady.id);
      })
      .catch((err) =>
        setDocumentsError(err instanceof ApiError ? err.message : "Failed to load documents.")
      );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGenerateError(null);
    setGeneratedQuiz(null);
    setGenerating(true);
    try {
      const result = await generateQuiz({
        document_id: documentId,
        topic: topic.trim() || null,
        difficulty,
        question_count: questionCount,
      });
      setGeneratedQuiz(result);
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : "Failed to generate quiz.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-1 bg-[#f8f9fe] min-h-screen">
      <AppSidebar active="quiz" />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <QuizNav activeTab="generate" />

        <main className="flex-1 py-10 px-4 sm:px-6 flex items-center justify-center">
          <div className="w-full max-w-xl">
            {/* Main Card */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-950/5 border border-slate-100/80 p-8 sm:p-10 relative overflow-hidden backdrop-blur-sm">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Configure Your Quiz
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 font-normal">
                  Tailor your study session to test your knowledge.
                </p>
              </div>

              {documentsError && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{documentsError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Select Document */}
                <div className="space-y-2">
                  <label htmlFor="document" className="block text-xs font-semibold text-slate-700 tracking-wide">
                    Select Document
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <select
                      id="document"
                      required
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      disabled={documents.length === 0}
                      className="w-full appearance-none rounded-2xl border border-slate-200/90 bg-[#fbfcfe] pl-11 pr-10 py-3.5 text-sm text-slate-700 font-medium transition-all focus:border-[#352599] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {documents.length === 0 && <option value="">Choose a study material...</option>}
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id} disabled={doc.status !== "ready"}>
                          {doc.filename} {doc.status !== "ready" ? `(${doc.status})` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Specific Topic */}
                <div className="space-y-2">
                  <label htmlFor="topic" className="block text-xs font-semibold text-slate-700 tracking-wide">
                    Specific Topic <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Classical Conditioning"
                      className="w-full rounded-2xl border border-slate-200/90 bg-[#fbfcfe] pl-11 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 font-medium transition-all focus:border-[#352599] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                {/* Difficulty Level */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-slate-700 tracking-wide">
                    Difficulty Level
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#eef1f8] p-1.5">
                    {DIFFICULTIES.map(({ key, label }) => {
                      const isSelected = difficulty === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDifficulty(key)}
                          className={`rounded-xl py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? "bg-white text-slate-900 shadow-sm font-semibold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Number of Questions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 tracking-wide">
                      Number of Questions
                    </span>
                    <span className="text-xl font-bold text-[#352599]">{questionCount}</span>
                  </div>
                  
                  {/* Range Slider Container */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min="5"
                      max="15"
                      step="5"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value) as QuestionCount)}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e2e7f4] accent-[#352599] focus:outline-none"
                    />
                    <div className="flex justify-between text-[11px] font-medium text-slate-400 px-0.5">
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={generating || !documentId}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#352599] hover:bg-[#2c1d85] active:scale-[0.99] py-4 text-sm sm:text-base font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-indigo-200" />
                  {generating ? "Generating Your Quiz..." : "Generate Quiz"}
                </button>
              </form>

              {/* Loading Indicator */}
              {generating && (
                <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-indigo-50/50 py-4 text-sm font-medium text-[#352599] border border-indigo-100">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-[#352599]" />
                  Synthesizing questions from your notes...
                </div>
              )}

              {/* Error Message */}
              {generateError && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{generateError}</span>
                </div>
              )}

              {/* Success State */}
              {generatedQuiz && (
                <div className="mt-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-6">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Quiz Ready!</span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-emerald-700 capitalize">
                    {questionCount} questions &middot; {difficulty} difficulty
                    {topic ? ` · Topic: ${topic}` : ""}
                  </p>
                  <Link
                    href={`/quizzes/${generatedQuiz.quiz_id}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#352599] hover:bg-[#2c1d85] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all"
                  >
                    <span>Start Quiz</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function GenerateQuizPage() {
  return (
    <ProtectedRoute>
      <GenerateQuizForm />
    </ProtectedRoute>
  );
}


