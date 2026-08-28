"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground shadow-sm">
        🎓
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Study Buddy</h1>
      <p className="max-w-md text-muted-foreground">
        Generate quizzes from your study documents and track your progress.
      </p>

      {loading ? null : user ? (
        <Link
          href="/dashboard"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          Go to dashboard
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
