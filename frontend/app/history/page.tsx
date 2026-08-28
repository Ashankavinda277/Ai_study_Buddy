"use client";

import { useState, useEffect } from "react";
import { listChatSessions, deleteChatSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Session = {
  id: string;
  document_id: string;
  title: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    const data = await listChatSessions();
    setSessions(data);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteChatSession(id);
    await fetchSessions();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Chat History</h1>

      {sessions.length === 0 && (
        <p className="text-gray-500 text-sm">No conversations yet.</p>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{session.title || "Untitled conversation"}</p>
              <p className="text-sm text-gray-500">
                {new Date(session.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = `/chat/${session.document_id}?session=${session.id}`)
                }
              >
                Open
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(session.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}