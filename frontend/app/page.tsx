"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold">AI Study Buddy</h1>
      <p className="max-w-md text-zinc-500">
        Generate quizzes from your study documents and track your progress.
      </p>

      {loading ? null : user ? (
        <Link
          href="/dashboard"
          className="rounded-full bg-foreground px-6 py-3 text-background"
        >
          Go to dashboard
        </Link>
      ) : (
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-full border border-black/15 px-6 py-3 dark:border-white/15"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-foreground px-6 py-3 text-background"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
