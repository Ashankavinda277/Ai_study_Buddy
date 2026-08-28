"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentContextPanel } from "@/components/document-context-panel";
import { listDocuments, type Document } from "@/lib/api";

function ChatLanding() {
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-1 bg-indigo-50/40">
      <AppSidebar active="chat" />

      <DocumentContextPanel
        documents={documents}
        loading={loading}
        onSelect={(id) => router.push(`/chat/${id}`)}
      />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-indigo-100 bg-white px-6 py-4">
          <Bot className="h-5 w-5 text-indigo-900" />
          <h1 className="font-serif text-lg font-semibold text-indigo-950">Chat with your Notes</h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-900">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 font-serif text-xl font-semibold text-indigo-950">
            Select a document to begin
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-indigo-400">
            Choose a document from the list on the left to start asking questions about your
            notes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChatLandingPage() {
  return (
    <ProtectedRoute>
      <ChatLanding />
    </ProtectedRoute>
  );
}
