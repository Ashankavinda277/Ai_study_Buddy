"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  HelpCircle,
  ListChecks,
  MessageSquare,
  TrendingUp,
  UploadCloud,
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";

const STEPS = [
  {
    title: "Upload your notes",
    description: "Go to My Notes and upload a PDF. We'll chunk and process it automatically.",
    icon: UploadCloud,
  },
  {
    title: "Chat or generate a quiz",
    description: "Ask AI Chat questions about your notes, or head to the Quiz Module to configure a quiz.",
    icon: MessageSquare,
  },
  {
    title: "Take the quiz",
    description: "Answer at your own pace. Flag questions to revisit before submitting.",
    icon: ListChecks,
  },
  {
    title: "Review & improve",
    description: "See your score, get AI feedback on what to review, and track weak topics over time.",
    icon: TrendingUp,
  },
];

const MODULES = [
  {
    title: "My Notes",
    href: "/documents",
    icon: FileText,
    description: "Upload and manage the study material everything else is built on.",
    points: [
      "Only PDF files are supported, up to 20MB.",
      "A document must reach \"Ready\" status before you can chat with it or quiz from it.",
      "If processing fails, use Retry on the document card.",
    ],
  },
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "Ask questions about a document and get answers grounded in your own notes.",
    points: [
      "Every answer cites the filename and page it came from — nothing is made up.",
      "Pick a document from the list to start a new conversation.",
      "Previous conversations show up under Recents in the sidebar.",
    ],
  },
  {
    title: "Quiz Module",
    href: "/quizzes/new",
    icon: ListChecks,
    description: "Configure, generate, and take AI-written quizzes based on your notes.",
    points: [
      "Configure Quiz: pick a ready document, an optional topic, difficulty, and 5/10/15 questions.",
      "The AI only uses your document's content — never outside knowledge — and every question is validated before it's saved.",
      "Quiz History lists every past attempt with filters by topic/difficulty and sorting.",
      "Results show correct answers, explanations, and short personalized AI feedback on what to review.",
    ],
  },
  {
    title: "My Progress",
    href: "/progress",
    icon: TrendingUp,
    description: "A dashboard of how you're doing across every quiz you've taken.",
    points: [
      "Average, best, and most recent scores, plus a score trend chart over time.",
      "Performance by topic, so you can see exactly where you're strong.",
      "Topics are classified Strong (75%+), Average (50–74%), or Weak (below 50%).",
    ],
  },
];

const FAQS = [
  {
    q: "Why can't I select my document when generating a quiz?",
    a: "It needs to finish processing first. Check My Notes — only documents with a \"Ready\" status can be used for chat or quiz generation.",
  },
  {
    q: "Why did quiz generation fail?",
    a: "Occasionally the AI's response doesn't pass our validation checks (exact question count, four options, one correct answer, no duplicates). We automatically retry once — if it still fails, try a narrower topic or fewer questions.",
  },
  {
    q: "Can I see the correct answers before I submit?",
    a: "No — that's intentional. Answers and explanations only appear after you submit, so the quiz actually tests you.",
  },
  {
    q: "What do Strong / Average / Weak mean on my Progress page?",
    a: "They're based on your running accuracy per topic across every quiz you've taken: 75%+ is Strong, 50–74% is Average, and below 50% is Weak.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your uploaded notes, chats, and quiz results are tied to your account only.",
  },
];

function HelpContent() {
  return (
    <div className="flex flex-1 bg-indigo-50/40">
      <AppSidebar active="help" />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center gap-2 border-b border-indigo-100 bg-white px-6 py-4">
          <HelpCircle className="h-5 w-5 text-indigo-900" />
          <h1 className="font-serif text-lg font-semibold text-indigo-950">Help &amp; Guide</h1>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-4xl">
            {/* Intro banner */}
            <div className="relative overflow-hidden rounded-3xl bg-indigo-950 p-8 sm:p-10">
              <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-700/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
              <div className="relative flex items-center gap-2 text-white/80">
                <GraduationCap className="h-5 w-5" />
                <span className="text-sm font-medium">AI Study Buddy</span>
              </div>
              <h2 className="relative mt-4 font-serif text-2xl font-bold text-white sm:text-3xl">
                Turn your notes into quizzes, answers, and progress you can see.
              </h2>
              <p className="relative mt-3 max-w-xl text-sm text-indigo-200 sm:text-base">
                This guide walks through every module — upload your notes, chat with them, generate
                a quiz, and track how you're improving.
              </p>
            </div>

            {/* Getting started */}
            <section className="mt-10">
              <h2 className="font-serif text-xl font-bold text-indigo-950">Getting started</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <Icon className="h-4 w-4 text-indigo-400" />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-indigo-950">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-indigo-400">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Modules */}
            <section className="mt-10">
              <h2 className="font-serif text-xl font-bold text-indigo-950">Modules</h2>
              <div className="mt-4 space-y-4">
                {MODULES.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.title}
                      className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                          <Icon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold text-indigo-950">{module.title}</h3>
                            <Link
                              href={module.href}
                              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Open <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                          <p className="mt-1 text-sm text-indigo-400">{module.description}</p>
                          <ul className="mt-3 space-y-1.5">
                            {module.points.map((point) => (
                              <li
                                key={point}
                                className="flex items-start gap-2 text-xs text-indigo-600"
                              >
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FAQ */}
            <section className="mt-10 mb-12">
              <h2 className="font-serif text-xl font-bold text-indigo-950">
                Frequently asked questions
              </h2>
              <div className="mt-4 space-y-3">
                {FAQS.map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-indigo-950">
                      {faq.q}
                      <ChevronDown className="h-4 w-4 shrink-0 text-indigo-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-indigo-400">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <ProtectedRoute>
      <HelpContent />
    </ProtectedRoute>
  );
}
