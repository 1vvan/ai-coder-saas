"use client";

import { useEffect, useState } from "react";
import DocumentChat from "@/components/DocumentChat";
import DocumentForm from "@/components/DocumentForm";
import DocumentPreview from "@/components/DocumentPreview";
import LoginScreen from "@/components/LoginScreen";
import {
  fetchDocumentTypes,
  fetchTerms,
  mergeParties,
  mergeValues,
  type ChatApiResponse,
  type DocumentType,
  type PartyInfo,
  type TermBlock,
} from "@/lib/documents";
import { clearStoredEmail, useStoredEmail } from "@/lib/session";

export default function Home() {
  const email = useStoredEmail();

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [parties, setParties] = useState<PartyInfo[]>([]);
  const [complete, setComplete] = useState(false);
  const [terms, setTerms] = useState<{ title: string; terms: TermBlock[] } | null>(null);

  useEffect(() => {
    fetchDocumentTypes()
      .then(setDocTypes)
      .catch(() => setDocTypes([]));
  }, []);

  // Load the verbatim Standard Terms whenever the active document type changes.
  useEffect(() => {
    if (!activeType) return;
    let cancelled = false;
    fetchTerms(activeType)
      .then((t) => {
        if (!cancelled) setTerms(t);
      })
      .catch(() => {
        if (!cancelled) setTerms(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeType]);

  const activeDoc = docTypes.find((d) => d.slug === activeType) ?? null;

  const onResult = (res: ChatApiResponse) => {
    const nextType = res.documentType ?? activeType;
    const doc = docTypes.find((d) => d.slug === nextType) ?? null;
    const switching = nextType !== activeType;
    const baseValues = switching ? {} : values;
    const baseParties = switching ? [] : parties;

    setActiveType(nextType);
    setValues(mergeValues(baseValues, res.fields));
    setParties(mergeParties(baseParties, res.parties, doc?.partyRoles ?? []));
    setComplete(res.complete);
  };

  if (!email) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Prelegal</h1>
            <p className="text-sm text-slate-500">
              Chat with the AI to draft any supported agreement, fine-tune the
              fields, then download it as a PDF.
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
              disabled={!activeDoc}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-2">
        <div className="no-print space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <DocumentChat
              documentType={activeType}
              values={values}
              parties={parties}
              complete={complete}
              onResult={onResult}
            />
          </section>
          {activeDoc ? (
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <DocumentForm
                doc={activeDoc}
                values={values}
                parties={parties}
                onChangeValues={setValues}
                onChangeParties={setParties}
              />
            </section>
          ) : null}
        </div>

        <section className="lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {activeDoc && terms ? (
              <DocumentPreview
                doc={activeDoc}
                values={values}
                parties={parties}
                terms={terms.terms}
                title={terms.title}
              />
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                Your document will appear here once we know which type you need.
                Tell the AI what you&apos;re looking for to get started.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
