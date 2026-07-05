"use client";

import { useEffect, useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import NdaDocument from "@/components/NdaDocument";
import NdaForm from "@/components/NdaForm";
import type { User } from "@/lib/api";
import { defaultFormData } from "@/lib/nda";

const USER_KEY = "prelegal.user";

export default function Home() {
  const [data, setData] = useState(defaultFormData);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a previous (fake) session from localStorage on first render.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) setUser(JSON.parse(stored) as User);
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  function handleSignedIn(u: User) {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      // ignore storage failures
    }
  }

  function handleSignOut() {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore storage failures
    }
  }

  // Avoid a flash of the login screen before we've checked storage.
  if (!ready) return null;

  if (!user) {
    return <LoginScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Mutual NDA Creator</h1>
            <p className="text-sm text-slate-500">
              Fill in the details, preview your agreement, and download it as a
              PDF.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: "#753991" }}
            >
              Download PDF
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: "#888888" }}>Hi, {user.name}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-2">
        <section className="no-print rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <NdaForm data={data} onChange={setData} />
        </section>

        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <NdaDocument data={data} />
          </div>
        </section>
      </main>
    </div>
  );
}
