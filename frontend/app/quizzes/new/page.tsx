"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { ProtectedRoute } from "@/components/protected-route";
import {
  ApiError,
  fetchAvailableDocuments,
  generateQuiz,
  type AvailableDocument,
  type Difficulty,
  type QuestionCount,
  type QuizGenerateResponse,
} from "@/lib/api";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
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
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Generate a quiz</h1>
      <p className="mt-1 text-sm text-zinc-500">Pick a document and configure your quiz.</p>

      {documentsError && (
        <p className="mt-4 rounded bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {documentsError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1">
          <label htmlFor="document" className="text-sm font-medium">
            Document
          </label>
          <select
            id="document"
            required
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            disabled={documents.length === 0}
            className="w-full rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
          >
            {documents.length === 0 && <option value="">No documents available</option>}
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id} disabled={doc.status !== "ready"}>
                {doc.filename}
                {doc.status !== "ready" ? ` (${doc.status})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="topic" className="text-sm font-medium">
            Topic <span className="font-normal text-zinc-400">(optional — leave blank for the entire document)</span>
          </label>
          <input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Normalization"
            className="w-full rounded border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Difficulty</span>
          <div className="flex gap-2">
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={`flex-1 rounded border px-3 py-2 text-sm capitalize ${
                  difficulty === level
                    ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Number of questions</span>
          <div className="flex gap-2">
            {QUESTION_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setQuestionCount(count)}
                className={`flex-1 rounded border px-3 py-2 text-sm ${
                  questionCount === count
                    ? "border-foreground bg-black/[.04] dark:bg-white/[.08]"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={generating || !documentId}
          className="w-full rounded bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Quiz"}
        </button>
      </form>

      {generating && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-foreground dark:border-white/20" />
          Generating your quiz...
        </div>
      )}

      {generateError && (
        <p className="mt-6 rounded bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {generateError}
        </p>
      )}

      {generatedQuiz && (
        <div className="mt-6 rounded-lg border border-green-200 p-6 dark:border-green-900">
          <p className="font-medium text-green-700 dark:text-green-400">Quiz generated!</p>
          <p className="mt-1 text-sm capitalize text-zinc-500">
            {questionCount} questions &middot; {difficulty}
            {topic ? ` · ${topic}` : ""}
          </p>
          <Link
            href={`/quizzes/${generatedQuiz.quiz_id}`}
            className="mt-4 inline-block rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Start Quiz
          </Link>
        </div>
      )}
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
