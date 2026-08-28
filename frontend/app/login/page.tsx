"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, GraduationCap, Lock, Mail } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/documents");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Branding panel */}
      <div className="relative hidden overflow-hidden bg-indigo-950 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-700/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative flex items-center gap-2 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-serif text-lg font-semibold">AI Study Buddy</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl leading-tight font-bold text-white">
            Turn your notes into answers.
          </h2>
          <p className="mt-4 text-indigo-200">
            Upload your study material, ask questions, and get grounded answers with the exact
            page they came from.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-zinc-500">
          Need an account?{" "}
          <Link href="/register" className="font-medium underline">
            Register
          </Link>
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="mb-8 flex flex-col items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-900 shadow-md lg:hidden">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold text-indigo-950 lg:mt-0">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-indigo-400">
              Sign in to continue your academic journey.
            </p>
          </div>

          <div className="mb-6 flex rounded-full bg-indigo-50 p-1">
            <span className="flex-1 rounded-full bg-white py-2 text-center text-sm font-semibold text-indigo-950 shadow-sm">
              Sign In
            </span>
            <Link
              href="/register"
              className="flex-1 rounded-full py-2 text-center text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-600"
            >
              Create Account
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-indigo-950">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-indigo-300" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border-none bg-indigo-50/70 py-2.5 pr-4 pl-11 text-sm text-indigo-950 placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-indigo-950">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-indigo-300" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border-none bg-indigo-50/70 py-2.5 pr-11 pl-11 text-sm text-indigo-950 placeholder:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-indigo-300 hover:text-indigo-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-indigo-900 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-800 disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
