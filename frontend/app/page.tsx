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
    <div className="flex flex-1 flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-indigo-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-900">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-base font-bold text-indigo-950">AI Study Buddy</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-indigo-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Studying
          </span>
          <h1 className="mt-5 font-serif text-4xl leading-tight font-bold text-indigo-950 md:text-5xl">
            Master Any Subject with Your <span className="text-indigo-600">AI Study Partner</span>
          </h1>
          <p className="mt-5 max-w-md text-indigo-500">
            Upload your notes, chat with your documents, and get grounded answers with the exact
            page they came from -- no more hunting through PDFs.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-800"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {stats && stats.total_users > 0 && (
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {stats.initials.map((letter, i) => (
                  <div
                    key={i}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[11px] font-semibold text-indigo-700"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-xs text-indigo-400">
                Joined by {stats.total_users} student{stats.total_users === 1 ? "" : "s"} studying
                smarter every day
              </p>
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute -top-6 -right-6 z-10 hidden h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg md:flex">
            <Bot className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-6 shadow-sm">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-indigo-50 pb-3">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-950">Biology_Chapter_4.pdf</span>
              </div>
              <p className="mt-3 text-xs text-indigo-400">
                &quot;Cellular respiration converts glucose and oxygen into ATP, releasing carbon
                dioxide and water as byproducts...&quot;
              </p>
              <div className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600">
                <Bot className="h-3 w-3" />
                Ask AI Study Buddy
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold text-indigo-950">
            Supercharge Your Study Sessions
          </h2>
          <p className="mt-2 text-sm text-indigo-400">
            Everything you need to turn dense material into clear, confident understanding.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={FileText}
            title="Intelligent Document Processing"
            description="Upload PDFs and lecture notes -- we extract, chunk, and embed them automatically so the AI can search across everything you upload."
          />
          <FeatureCard
            icon={ListChecks}
            title="Instant Quiz Generation"
            description="Turn any document into a practice quiz to test recall and target the concepts you still need to review."
          />
          <FeatureCard
            icon={Bot}
            title="Interactive AI Chat"
            description="Ask questions in plain language and get grounded answers with the exact page they came from."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-indigo-50/60 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl font-bold text-indigo-950">
            How It Works
          </h2>
          <p className="mt-2 text-center text-sm text-indigo-400">
            From raw notes to real understanding in three simple steps.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <Step
              number={1}
              icon={UploadCloud}
              title="Upload"
              description="Bring your notes and lecture PDFs in -- we handle the parsing and organizing."
            />
            <Step
              number={2}
              icon={Bot}
              title="Analyze"
              description="Chat with your documents and get grounded, cited answers in seconds."
            />
            <Step
              number={3}
              icon={Sparkles}
              title="Excel"
              description="Review, retain, and walk into your next exam with confidence."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-indigo-950 px-8 py-14 text-center">
          <h2 className="font-serif text-3xl font-bold text-white">
            Ready to upgrade your study routine?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-indigo-200">
            Join students who are studying smarter, not longer, with AI Study Buddy.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-900 transition-colors hover:bg-indigo-50"
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
