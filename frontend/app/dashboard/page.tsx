"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/documents");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-indigo-400">Redirecting...</p>
    </div>
  );
}
