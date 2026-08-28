"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { formatSize } from "@/lib/format";
import type { Document } from "@/lib/api";

type DocumentContextPanelProps = {
  documents: Document[];
  loading: boolean;
  activeDocumentId?: string;
  onSelect: (documentId: string) => void;
};

export function DocumentContextPanel({
  documents,
  loading,
  activeDocumentId,
  onSelect,
}: DocumentContextPanelProps) {
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  const otherDocs = documents.filter((d) => d.id !== activeDocumentId);

  return (
    <div className="hidden w-72 shrink-0 flex-col border-r border-indigo-100 bg-white px-5 py-6 md:flex">
      <Link
        href="/documents"
        className="flex items-center gap-1.5 text-sm font-medium text-indigo-500 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <h2 className="mt-5 text-lg font-semibold text-indigo-950">
        {activeDoc ? "Context Document" : "Select a Document"}
      </h2>
      <p className="mt-1 text-sm text-indigo-400">
        {activeDoc
          ? "The AI is currently answering based on this specific file."
          : "Choose a document below to start a conversation."}
      </p>

      {loading ? (
        <p className="mt-5 text-sm text-indigo-400">Loading...</p>
      ) : (
        <>
          {activeDoc && (
            <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                  <FileText className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-indigo-950">{activeDoc.filename}</p>
                  <p className="text-xs text-indigo-400">PDF · {formatSize(activeDoc.size_bytes)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Active Context</span>
              </div>
            </div>
          )}

          {otherDocs.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold tracking-wide text-indigo-300 uppercase">
                {activeDoc ? "Switch Document" : "Your Documents"}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {otherDocs.map((doc) => {
                  const ready = doc.status === "ready";
                  return (
                    <button
                      key={doc.id}
                      onClick={() => ready && onSelect(doc.id)}
                      disabled={!ready}
                      className={`flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors ${
                        ready ? "hover:border-indigo-100 hover:bg-indigo-50" : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-indigo-950">{doc.filename}</p>
                      </div>
                      {!ready && <StatusBadge status={doc.status} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!activeDoc && documents.length === 0 && (
            <p className="mt-5 text-sm text-indigo-400">
              No documents yet -- upload one from the Dashboard.
            </p>
          )}
        </>
      )}
    </div>
  );
}
