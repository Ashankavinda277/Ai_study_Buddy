"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, consumeGuardSkip } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || user) return;

    // A logout just cleared the user and is navigating somewhere itself.
    // Stand down once, so we don't race it to /login.
    if (consumeGuardSkip()) return;

    router.replace("/login");
  }, [loading, user, router, consumeGuardSkip]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
