"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  FileText,
  Mic,
  Paperclip,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { StatusBadge } from "@/components/status-badge";
import { formatSize } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { askQuestion, getChatHistory, listDocuments, type Document } from "@/lib/api";

type Source = { filename: string; page_number: number | null };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

function ChatWithNotes() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const documentId = params.documentId as string;
  const initialSessionId = searchParams.get("session") ?? undefined;

  const [doc, setDoc] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(Boolean(initialSessionId));
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the document's own metadata for the context panel
  useEffect(() => {
    listDocuments()
      .then((docs) => setDoc(docs.find((d) => d.id === documentId) ?? null))
      .catch((err) => console.error(err))
      .finally(() => setDocLoading(false));
  }, [documentId]);

  // Load existing history if resuming a session
  useEffect(() => {
    if (initialSessionId) {
      getChatHistory(initialSessionId)
        .then((data) => {
          const loaded: Message[] = data.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            sources: m.sources ?? undefined,
          }));
          setMessages(loaded);
        })
        .catch((err) => console.error(err))
        .finally(() => setHistoryLoading(false));
    }
  }, [initialSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const question = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await askQuestion(question, documentId, sessionId);
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((v) => (v === index ? null : v)), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-1 bg-indigo-50/40">
      <AppSidebar active="chat" />

      {/* Context panel */}
      <div className="hidden w-72 shrink-0 flex-col border-r border-indigo-100 bg-white px-5 py-6 md:flex">
        <Link
          href="/documents"
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-500 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <h2 className="mt-5 text-lg font-semibold text-indigo-950">Context Document</h2>
        <p className="mt-1 text-sm text-indigo-400">
          The AI is currently answering based on this specific file.
        </p>

        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          {docLoading ? (
            <p className="text-sm text-indigo-400">Loading...</p>
          ) : doc ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                  <FileText className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-indigo-950">{doc.filename}</p>
                  <p className="text-xs text-indigo-400">PDF · {formatSize(doc.size_bytes)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {doc.status === "ready" ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700">Active Context</span>
                  </>
                ) : (
                  <StatusBadge status={doc.status} />
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-indigo-400">Document not found.</p>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-indigo-100 bg-white px-6 py-4">
          <Bot className="h-5 w-5 text-indigo-900" />
          <h1 className="font-serif text-lg font-semibold text-indigo-950">Chat with your Notes</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {historyLoading ? (
              <p className="text-center text-sm text-indigo-400">Loading conversation...</p>
            ) : messages.length === 0 ? (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-900">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-indigo-950 shadow-sm">
                  Hello! I&apos;ve loaded{" "}
                  <span className="font-semibold">
                    {doc ? `"${doc.filename}"` : "your document"}
                  </span>
                  . I&apos;m ready to help you study -- ask me anything about it.
                </div>
              </div>
            ) : (
              messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={i} className="flex items-start justify-end gap-3">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-900 px-4 py-3 text-sm text-white shadow-sm">
                      {msg.content}
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-900">
                      {user?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-900">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-[85%] space-y-2">
                      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm whitespace-pre-wrap text-indigo-950 shadow-sm">
                        {msg.content}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
                            >
                              <FileText className="h-3 w-3" />
                              {src.filename}
                              {src.page_number !== null ? ` · p. ${src.page_number}` : ""}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1 pl-1">
                        <button
                          onClick={() => handleCopy(msg.content, i)}
                          className="flex items-center justify-center rounded-full p-1.5 text-indigo-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          aria-label="Copy response"
                        >
                          {copiedIndex === i ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          title="Not available yet"
                          className="flex cursor-not-allowed items-center justify-center rounded-full p-1.5 text-indigo-200"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Not available yet"
                          className="flex cursor-not-allowed items-center justify-center rounded-full p-1.5 text-indigo-200"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )
            )}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-900">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-indigo-400 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-indigo-100 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1.5">
            <button
              title="Not available yet"
              className="flex cursor-not-allowed items-center justify-center rounded-full p-2 text-indigo-300"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your notes..."
              disabled={loading}
              className="flex-1 bg-transparent py-2 text-sm text-indigo-950 placeholder:text-indigo-300 outline-none"
            />
            <button
              title="Not available yet"
              className="flex cursor-not-allowed items-center justify-center rounded-full p-2 text-indigo-300"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-indigo-300">
            AI Study Buddy can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatWithNotes />
    </ProtectedRoute>
  );
}
