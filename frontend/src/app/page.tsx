"use client";

import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import NdaChat from "@/components/NdaChat";
import NdaDocument from "@/components/NdaDocument";
import NdaForm from "@/components/NdaForm";
import { defaultFormData } from "@/lib/nda";
import { clearStoredEmail, useStoredEmail } from "@/lib/session";

export default function Home() {
  const [data, setData] = useState(defaultFormData);
  const email = useStoredEmail();

  if (!email) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Mutual NDA Creator</h1>
            <p className="text-sm text-slate-500">
              Chat with the AI to build your agreement, fine-tune any field, then
              download it as a PDF.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-slate-500">Signed in as</p>
              <p className="font-medium text-slate-900">{email}</p>
            </div>
            <button
              type="button"
              onClick={clearStoredEmail}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-2">
        <div className="no-print space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <NdaChat data={data} onChange={setData} />
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <NdaForm data={data} onChange={setData} />
          </section>
        </div>

        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <NdaDocument data={data} />
          </div>
        </section>
      </main>
    </div>
  );
}
