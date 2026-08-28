"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  NotebookText,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { listChatSessions, type ChatSessionSummary } from "@/lib/api";

export type SidebarActiveKey = "dashboard" | "notes" | "chat" | "quiz";

const NAV_ITEMS: {
  key: SidebarActiveKey;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/documents" },
  { key: "notes", label: "My Notes", icon: NotebookText, href: "/documents" },
  { key: "chat", label: "AI Chat", icon: MessageSquare, href: "/chat" },
  { key: "quiz", label: "Quiz Module", icon: ListChecks, href: "/documents" },
];

// Only these have a real destination today. Everything else is visually
// present but not wired up yet.
const REAL_KEYS: SidebarActiveKey[] = ["dashboard", "chat"];

const RECENTS_LIMIT = 6;

export function AppSidebar({ active }: { active: SidebarActiveKey }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [recents, setRecents] = useState<ChatSessionSummary[]>([]);

  useEffect(() => {
    listChatSessions()
      .then((sessions) => setRecents(sessions.slice(0, RECENTS_LIMIT)))
      .catch((err) => console.error(err));
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-indigo-100 bg-white px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-serif text-sm font-bold text-indigo-950">AI Study Buddy</p>
          <p className="text-[11px] text-indigo-400">Academic Excellence</p>
        </div>
      </div>

      <button
        onClick={() => router.push("/documents")}
        className="mt-6 flex items-center justify-center gap-1.5 rounded-full bg-indigo-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-800"
      >
        <Plus className="h-4 w-4" />
        New Study Session
      </button>

      <div className="mt-8 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            const isReal = REAL_KEYS.includes(item.key);

            if (isActive) {
              return (
                <span
                  key={item.key}
                  className="flex items-center gap-2.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              );
            }

            if (isReal) {
              return (
                <button
                  key={item.key}
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            }

            return (
              <span
                key={item.key}
                title="Not available yet"
                className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-indigo-300"
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                  Soon
                </span>
              </span>
            );
          })}
        </nav>

        <div className="mt-6">
          <p className="px-3 text-[11px] font-semibold tracking-wide text-indigo-300 uppercase">
            Recents
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {recents.length === 0 ? (
              <p className="px-3 py-1.5 text-xs text-indigo-300">No conversations yet</p>
            ) : (
              recents.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/chat/${session.document_id}?session=${session.id}`)}
                  title={session.title ?? "Untitled Conversation"}
                  className="truncate rounded-lg px-3 py-1.5 text-left text-xs text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {session.title || "Untitled Conversation"}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-indigo-100 pt-4">
        <span
          title="Not available yet"
          className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-indigo-300"
        >
          <Settings className="h-4 w-4" />
          Settings
        </span>
        <span
          title="Not available yet"
          className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-indigo-300"
        >
          <Sparkles className="h-4 w-4" />
          Help
        </span>

        <div className="mt-3 flex items-center gap-2 border-t border-indigo-100 pt-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-900 text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-indigo-950">{user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="flex items-center justify-center rounded-full p-1.5 text-indigo-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
