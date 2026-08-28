import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  GraduationCap,
  ListChecks,
  Sparkles,
  UploadCloud,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
        <Icon className="h-5 w-5 text-indigo-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-indigo-950">{title}</h3>
      <p className="mt-1.5 text-sm text-indigo-400">{description}</p>
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number;
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
        <Icon className="h-6 w-6 text-indigo-600" />
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-900 text-[10px] font-bold text-white">
          {number}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-indigo-950">{title}</h3>
      <p className="mt-1.5 max-w-55 text-sm text-indigo-400">{description}</p>
    </div>
  );
}

type UserStats = { total_users: number; initials: string[] };

async function getUserStats(): Promise<UserStats | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${API_URL}/auth/stats`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as UserStats;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function Home() {
  const stats = await getUserStats();

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
            Get Started for Free Today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-100 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-900">
                <GraduationCap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-serif text-sm font-bold text-indigo-950">AI Study Buddy</span>
            </div>
            <p className="mt-1 text-xs text-indigo-400">
              Turn your notes into grounded, cited answers with AI.
            </p>
          </div>
          <p className="text-xs text-indigo-300">
            © {new Date().getFullYear()} AI Study Buddy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
