"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrandMark from "@/components/BrandMark";
import DocumentChat from "@/components/DocumentChat";
import DocumentForm from "@/components/DocumentForm";
import DocumentLibrary from "@/components/DocumentLibrary";
import DocumentPreview from "@/components/DocumentPreview";
import LoginScreen from "@/components/LoginScreen";
import {
  deleteDraft,
  fetchDocumentTypes,
  fetchTerms,
  getDraft,
  listDrafts,
  mergeParties,
  mergeValues,
  saveDraft,
  valuesFromFields,
  type ChatApiResponse,
  type DocumentSummary,
  type DocumentType,
  type PartyInfo,
  type TermBlock,
} from "@/lib/documents";
import { signOut, useSession } from "@/lib/session";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function Home() {
  const session = useSession();

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [parties, setParties] = useState<PartyInfo[]>([]);
  const [complete, setComplete] = useState(false);
  const [terms, setTerms] = useState<{ title: string; terms: TermBlock[] } | null>(null);

  // Saved-document library.
  const [drafts, setDrafts] = useState<DocumentSummary[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // Bumped to remount the chat when starting fresh or opening a saved document.
  const [chatKey, setChatKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    fetchDocumentTypes()
      .then(setDocTypes)
      .catch(() => setDocTypes([]));
  }, [session]);

  // Load the verbatim Standard Terms whenever the active document type changes.
  // (No need to clear terms when there's no type — the preview only renders
  // when there's also an active doc, so stale terms are never shown.)
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

  const refreshDrafts = useCallback(async () => {
    // Only sets state after the await, so it doesn't trigger a synchronous
    // cascade when called from an effect on mount.
    try {
      setDrafts(await listDrafts());
    } catch {
      setDrafts([]);
    } finally {
      setDraftsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    listDrafts()
      .then((d) => {
        if (!cancelled) setDrafts(d);
      })
      .catch(() => {
        if (!cancelled) setDrafts([]);
      })
      .finally(() => {
        if (!cancelled) setDraftsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const activeDoc = docTypes.find((d) => d.slug === activeType) ?? null;

  // --- Persistence --------------------------------------------------------
  // Keep the latest editor state in a ref so the debounced saver reads fresh
  // values without re-subscribing on every keystroke.
  const stateRef = useRef({ activeType, values, parties, complete, draftId });
  useEffect(() => {
    stateRef.current = { activeType, values, parties, complete, draftId };
  });

  const persist = useCallback(async () => {
    const snap = stateRef.current;
    if (!snap.activeType) return;
    setSaveState("saving");
    try {
      const saved = await saveDraft({
        id: snap.draftId ?? undefined,
        documentType: snap.activeType,
        values: snap.values,
        parties: snap.parties,
        complete: snap.complete,
      });
      setDraftId(saved.id);
      setSaveState("saved");
      void refreshDrafts();
    } catch {
      setSaveState("error");
    }
  }, [refreshDrafts]);

  // Auto-save: once a document exists (saved once, or just completed), persist
  // subsequent edits on a short debounce.
  useEffect(() => {
    if (!activeType) return;
    const shouldAutosave = draftId !== null || complete;
    if (!shouldAutosave) return;
    // persist() flips the indicator to "Saving…" then "Saved" when it runs.
    const handle = setTimeout(() => void persist(), 900);
    return () => clearTimeout(handle);
  }, [activeType, values, parties, complete, draftId, persist]);

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

  const startNew = () => {
    setActiveType(null);
    setValues({});
    setParties([]);
    setComplete(false);
    setDraftId(null);
    setSaveState("idle");
    setChatKey((k) => k + 1);
  };

  const openDraft = async (id: number) => {
    try {
      const doc = await getDraft(id);
      setActiveType(doc.docType);
      setValues(valuesFromFields(doc.fields));
      setParties(doc.parties);
      setComplete(doc.complete);
      setDraftId(doc.id);
      setSaveState("saved");
      setChatKey((k) => k + 1);
      setLibraryOpen(false);
    } catch {
      setSaveState("error");
    }
  };

  const removeDraft = async (id: number) => {
    try {
      await deleteDraft(id);
      if (id === draftId) startNew();
      void refreshDrafts();
    } catch {
      // Ignore; the list will re-sync on the next refresh.
    }
  };

  if (!session) return <LoginScreen />;

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Save";

  return (
    <div className="brand-surface min-h-screen text-slate-900">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-navy">Prelegal</h1>
              <p className="text-xs text-slate-500">
                Chat with AI to draft any supported agreement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeDoc ? (
              <button
                type="button"
                onClick={() => void persist()}
                disabled={saveState === "saving"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {saveState === "saved" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="m5 12 5 5L20 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
                {saveLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              My documents
              {drafts.length > 0 ? (
                <span className="rounded-full bg-brand-blue/10 px-1.5 text-xs font-semibold text-brand-blue">
                  {drafts.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              New
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!activeDoc}
              className="inline-flex items-center justify-center rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-purple/90 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download PDF
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <span className="hidden text-sm text-slate-500 sm:inline" title={session.email}>
                {session.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="no-print border-b border-brand-yellow/40 bg-brand-yellow/10">
        <p className="mx-auto max-w-6xl px-6 py-2 text-center text-xs text-navy/80">
          <strong className="font-semibold">Draft only.</strong> Documents
          generated by Prelegal are drafts for your convenience and are subject
          to review by a qualified attorney. They do not constitute legal advice.
        </p>
      </div>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-2">
        <div className="no-print space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <DocumentChat
              key={chatKey}
              documentType={activeType}
              values={values}
              parties={parties}
              complete={complete}
              onResult={onResult}
            />
          </section>
          {activeDoc ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        <section className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {activeDoc && terms ? (
              <DocumentPreview
                doc={activeDoc}
                values={values}
                parties={parties}
                terms={terms.terms}
                title={terms.title}
              />
            ) : (
              <div className="p-12 text-center">
                <BrandMark size={44} className="mx-auto opacity-80" />
                <p className="mx-auto mt-4 max-w-xs text-sm text-slate-500">
                  Your document will appear here once we know which type you need.
                  Tell the AI what you&apos;re looking for to get started.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <DocumentLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        drafts={drafts}
        loading={!draftsLoaded}
        activeId={draftId}
        onOpen={(id) => void openDraft(id)}
        onDelete={(id) => void removeDraft(id)}
      />
    </div>
  );
}
