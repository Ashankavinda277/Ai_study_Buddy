"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <button
          onClick={handleLogout}
          className="rounded border border-black/15 px-4 py-2 text-sm dark:border-white/15"
        >
          Log out
        </button>
      </div>
      <p className="mt-4 text-zinc-500">Signed in as {user?.email}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-medium">Generate a quiz</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Configure a quiz from a document — topic, difficulty, question count.
          </p>
          <Link
            href="/quizzes/new"
            className="mt-4 inline-block rounded bg-foreground px-4 py-2 text-sm text-background"
          >
            Generate
          </Link>
        </div>

        <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-medium">Sample Quiz: Database Basics</h2>
          <p className="mt-1 text-sm text-zinc-500">
            A hand-written 5-question quiz, seeded for testing the quiz player. Owned
            by <code>seed@example.com</code>.
          </p>
          <Link
            href="/quizzes/1"
            className="mt-4 inline-block rounded border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            Take quiz
          </Link>
        </div>

        <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-medium">Quiz history</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Review your past attempts, scores, and AI feedback.
          </p>
          <Link
            href="/attempts"
            className="mt-4 inline-block rounded border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            View history
          </Link>
        </div>

        <div className="rounded-lg border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-medium">Learning progress</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Charts, average/best scores, and your weak topics.
          </p>
          <Link
            href="/progress"
            className="mt-4 inline-block rounded border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            View progress
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
