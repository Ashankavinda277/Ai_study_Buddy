"use client";

import Link from "next/link";
import { ListChecks, Sparkles, Clock } from "lucide-react";

export type QuizTabKey = "generate" | "history";

interface QuizNavProps {
  activeTab?: QuizTabKey;
}

export function QuizNav({ activeTab }: QuizNavProps) {
  const tabs: { key: QuizTabKey; label: string; href: string; icon: typeof Sparkles }[] = [
    { key: "generate", label: "Configure Quiz", href: "/quizzes/new", icon: Sparkles },
    { key: "history", label: "Quiz History", href: "/attempts", icon: Clock },
  ];

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-indigo-100 shadow-xs">
      {/* Standard Top Bar matching other pages */}

      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-900" />
          <h1 className="font-serif text-lg font-semibold text-indigo-950">Quiz Module</h1>
        </div>
      </header>

      {/* Underline Sub-Navigation Tabs matching Image 2 */}
      <div className="px-6 border-t border-slate-100 flex items-center gap-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-2 pt-3 pb-3 text-sm transition-all relative ${
                isActive
                  ? "text-[#352599] font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[#352599]" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#352599] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

