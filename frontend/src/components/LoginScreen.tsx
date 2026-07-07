"use client";

import { useState } from "react";

import BrandMark from "@/components/BrandMark";
import { signIn, signUp } from "@/lib/session";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || loading) return;

    setLoading(true);
    setError(null);
    try {
      if (isSignup) {
        await signUp(trimmed, password);
      } else {
        await signIn(trimmed, password);
      }
      // A successful auth flips the session store, re-rendering the app in.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="brand-surface flex min-h-screen items-center justify-center px-6 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={52} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-navy">
            Prelegal
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-slate-500">
            Draft professional legal agreements through a simple conversation
            with AI.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-navy/5">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={
                  "rounded-md px-3 py-2 text-sm font-medium transition " +
                  (mode === m
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-500 hover:text-slate-700")
                }
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "At least 6 characters" : "••••••••"}
              />
            </div>

            {error ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="inline-flex w-full items-center justify-center rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-purple/90 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? isSignup
                  ? "Creating account…"
                  : "Signing in…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isSignup ? "Already have an account? " : "New to Prelegal? "}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? "signin" : "signup")}
              className="font-medium text-brand-blue hover:underline"
            >
              {isSignup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Prelegal generates draft documents for convenience only. They are not
          legal advice and should be reviewed by a qualified attorney.
        </p>
      </div>
    </div>
  );
}
