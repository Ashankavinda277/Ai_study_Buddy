"use client";

import { useMemo, useRef, useState, useEffect, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Bell, FileText, MessageSquare, RotateCcw, Search, Trash2, UploadCloud } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { StatusBadge } from "@/components/status-badge";
import { formatSize, formatDate } from "@/lib/format";
import {
  uploadDocument,
  listDocuments,
  processDocument,
  deleteDocument,
  type Document,
} from "@/lib/api";

const MAX_SIZE_MB = 20;

function DocumentManager() {
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const data = await listDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load documents");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.filename.toLowerCase().includes(q));
  }, [documents, search]);

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      return;
    }
    setUploading(true);
    try {
      const doc = await uploadDocument(file);
      await processDocument(doc.id);
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await processDocument(id);
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Reprocessing failed");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="flex flex-1 bg-indigo-50/40">
      <AppSidebar active="dashboard" />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-indigo-100 bg-white px-6 py-3">
          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-indigo-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your documents..."
              className="w-full rounded-full border-none bg-indigo-50/70 py-2 pr-4 pl-9 text-sm text-indigo-950 placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            title="Not available yet"
            className="ml-auto hidden cursor-not-allowed items-center justify-center rounded-full p-2 text-indigo-400 sm:flex"
          >
            <Bell className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-serif text-3xl font-bold text-indigo-950">Document Manager</h1>
            <p className="mt-1 text-sm text-indigo-400">
              Upload and manage your study materials for AI processing.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                dragOver ? "border-indigo-400 bg-indigo-50" : "border-indigo-200 bg-white"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <UploadCloud className="h-6 w-6 text-indigo-500" />
              </div>
              <p className="mt-3 font-serif text-lg font-semibold text-indigo-950">
                {uploading ? "Uploading & processing..." : "Upload PDF Notes"}
              </p>
              <p className="mt-1 text-sm text-indigo-400">
                Drag and drop your files here or click to browse (Max {MAX_SIZE_MB}MB)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-900 transition-colors hover:bg-indigo-50 disabled:opacity-50"
              >
                {uploading ? "Working..." : "Select Files"}
              </button>
            </div>

            <h2 className="mt-8 text-lg font-semibold text-indigo-950">Your Documents</h2>

            {filteredDocuments.length === 0 ? (
              <p className="mt-4 text-sm text-indigo-400">
                {documents.length === 0
                  ? "No documents yet -- upload a PDF to get started."
                  : "No documents match your search."}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                        <FileText className="h-4 w-4 text-indigo-500" />
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-indigo-950">
                      {doc.filename}
                    </p>
                    <p className="mt-1 text-xs text-indigo-400">
                      {formatSize(doc.size_bytes)} · {formatDate(doc.created_at)}
                    </p>

                    <div className="mt-4 flex gap-2">
                      {doc.status === "failed" ? (
                        <button
                          onClick={() => handleRetry(doc.id)}
                          disabled={retryingId === doc.id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-indigo-900 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
                        >
                          <RotateCcw className={`h-3.5 w-3.5 ${retryingId === doc.id ? "animate-spin" : ""}`} />
                          {retryingId === doc.id ? "Retrying..." : "Retry"}
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/chat/${doc.id}`)}
                          disabled={doc.status !== "ready"}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-indigo-900 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Chat
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="flex items-center justify-center rounded-full border border-indigo-100 p-2 text-indigo-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <ProtectedRoute>
      <DocumentManager />
    </ProtectedRoute>
  );
}
