"use client";

import { useState, useEffect } from "react";
import { uploadDocument, listDocuments, processDocument, deleteDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Document = {
  id: string;
  filename: string;
  status: string;
  size_bytes: number;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Documents</h1>

      <div>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {uploading && <p className="text-sm text-gray-500 mt-2">Uploading & processing...</p>}
      </div>

      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{doc.filename}</p>
              <p className="text-sm text-gray-500">
                {doc.status} · {(doc.size_bytes / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => (window.location.href = `/chat/${doc.id}`)}
              >
                Chat
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(doc.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}