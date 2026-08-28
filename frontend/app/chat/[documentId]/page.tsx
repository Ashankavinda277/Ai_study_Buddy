"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { askQuestion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Source = {
  filename: string;
  page_number: number | null;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function ChatPage() {
  const params = useParams();
  const documentId = params.documentId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col h-screen">
      <h1 className="text-xl font-semibold mb-4">Chat with your document</h1>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <Card
            key={i}
            className={`p-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto bg-blue-50" : "mr-auto bg-gray-50"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-1">
                {msg.sources.map((src, j) => (
                  <p key={j}>
                    📄 {src.filename}
                    {src.page_number !== null ? ` — page ${src.page_number}` : ""}
                  </p>
                ))}
              </div>
            )}
          </Card>
        ))}
        {loading && <p className="text-sm text-gray-400">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this document..."
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading}>
          Send
        </Button>
      </div>
    </div>
  );
}
