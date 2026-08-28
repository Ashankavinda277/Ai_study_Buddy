"use client";

import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
        <button
          onClick={handleLogout}
          className="rounded border border-black/15 px-4 py-2 text-sm dark:border-white/15"
        >
          Log out
        </button>
      </div>
      <p className="mt-4 text-zinc-500">Signed in as {user?.email}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
