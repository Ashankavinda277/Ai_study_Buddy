"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Check,
  Copy,
  Mic,
  Paperclip,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentContextPanel } from "@/components/document-context-panel";
import { useAuth } from "@/lib/auth-context";
import { askQuestion, getChatHistory, listDocuments, type Document } from "@/lib/api";

type Source = { filename: string; page_number: number | null };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

type ListItem = { content: string; indent: number; ordered: boolean; children: ListItem[] };

// Assistant replies come back as Markdown (**bold**, bullet/numbered lists),
// but the bubble previously rendered them as raw text -- this turns that
// Markdown into readable, properly spaced JSX without pulling in a library.
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-indigo-950">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

function buildListTree(rawItems: { content: string; indent: number; ordered: boolean }[]) {
  const root: ListItem[] = [];
  const stack: { node: ListItem; indent: number }[] = [];

  for (const item of rawItems) {
    const node: ListItem = { ...item, children: [] };
    while (stack.length && stack[stack.length - 1].indent >= item.indent) stack.pop();
    (stack.length ? stack[stack.length - 1].node.children : root).push(node);
    stack.push({ node, indent: item.indent });
  }
  return root;
}

function renderListNodes(nodes: ListItem[], keyPrefix: string) {
  if (nodes.length === 0) return null;
  const Tag = nodes[0].ordered ? "ol" : "ul";
  return (
    <Tag className={nodes[0].ordered ? "list-decimal space-y-1.5 pl-5" : "list-disc space-y-1.5 pl-5"}>
      {nodes.map((node, i) => (
        <li key={`${keyPrefix}-${i}`}>
          {renderInline(node.content, `${keyPrefix}-${i}`)}
          {node.children.length > 0 && (
            <div className="mt-1.5">{renderListNodes(node.children, `${keyPrefix}-${i}`)}</div>
          )}
        </li>
      ))}
    </Tag>
  );
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const bulletRe = /^(\s*)[-*]\s+(.*)$/;
  const numberRe = /^(\s*)\d+\.\s+(.*)$/;
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }

    if (bulletRe.test(lines[i]) || numberRe.test(lines[i])) {
      const rawItems: { content: string; indent: number; ordered: boolean }[] = [];
      while (i < lines.length) {
        const bm = lines[i].match(bulletRe);
        const nm = lines[i].match(numberRe);
        if (bm) rawItems.push({ content: bm[2], indent: bm[1].length, ordered: false });
        else if (nm) rawItems.push({ content: nm[2], indent: nm[1].length, ordered: true });
        else break;
        i++;
      }
      blocks.push(<div key={`b-${blocks.length}`}>{renderListNodes(buildListTree(rawItems), `l-${blocks.length}`)}</div>);
      continue;
    }

    const headingMatch = lines[i].match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      blocks.push(
        <p key={`b-${blocks.length}`} className="font-semibold text-indigo-950">
          {renderInline(headingMatch[1], `h-${blocks.length}`)}
        </p>
      );
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !bulletRe.test(lines[i]) && !numberRe.test(lines[i]) && !/^#{1,6}\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(<p key={`b-${blocks.length}`}>{renderInline(paraLines.join(" "), `p-${blocks.length}`)}</p>);
  }

  return <div className="space-y-3 leading-relaxed">{blocks}</div>;
}

function ChatWithNotes() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const documentId = params.documentId as string;
  const initialSessionId = searchParams.get("session") ?? undefined;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [docLoading, setDocLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(Boolean(initialSessionId));
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load all documents for the context panel (active doc + switcher list)
  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch((err) => console.error(err))
      .finally(() => setDocLoading(false));
  }, []);

  const doc = documents.find((d) => d.id === documentId) ?? null;

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

      <DocumentContextPanel
        documents={documents}
        loading={docLoading}
        activeDocumentId={documentId}
        onSelect={(id) => router.push(`/chat/${id}`)}
      />

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
                      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-indigo-950 shadow-sm">
                        {renderMarkdown(msg.content)}
                      </div>

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
