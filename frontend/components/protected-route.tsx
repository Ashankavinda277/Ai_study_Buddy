"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, loggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !loggingOut) {
      router.replace("/login");
    }
  }, [loading, user, loggingOut, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
