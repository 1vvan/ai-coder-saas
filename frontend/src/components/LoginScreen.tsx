"use client";

import { useState } from "react";
import { login, type User } from "@/lib/api";

/**
 * Fake login screen for the V1 foundation (PL-3).
 *
 * There is no authentication yet: the user provides a display name (and an
 * optional email), we record them via the backend, and they are brought into
 * the platform. Real sign up / sign in is a later story.
 */
export default function LoginScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const user = await login(name.trim(), email.trim());
      onSignedIn(user);
    } catch {
      setError("Could not sign in. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold" style={{ color: "#032147" }}>
            Prelegal
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#888888" }}>
            Sign in to start drafting your legal agreements.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2"
              style={{ ["--tw-ring-color" as string]: "#209dd7" }}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email <span style={{ color: "#888888" }}>(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2"
              style={{ ["--tw-ring-color" as string]: "#209dd7" }}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#753991" }}
          >
            {busy ? "Signing in…" : "Enter platform"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs" style={{ color: "#888888" }}>
          No password needed — this is an early preview.
        </p>
      </div>
    </div>
  );
}
