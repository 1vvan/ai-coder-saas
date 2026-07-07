"use client";

import type { DocumentSummary } from "@/lib/documents";

interface DocumentLibraryProps {
  open: boolean;
  onClose: () => void;
  drafts: DocumentSummary[];
  loading: boolean;
  activeId: number | null;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}

function formatWhen(iso: string): string {
  // The backend stores UTC timestamps as "YYYY-MM-DD HH:MM:SS".
  const date = new Date(`${iso.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DocumentLibrary({
  open,
  onClose,
  drafts,
  loading,
  activeId,
  onOpen,
  onDelete,
}: DocumentLibraryProps) {
  return (
    <div
      className={
        "no-print fixed inset-0 z-40 transition " +
        (open ? "pointer-events-auto" : "pointer-events-none")
      }
      aria-hidden={!open}
    >
      <div
        className={
          "absolute inset-0 bg-navy/30 transition-opacity " +
          (open ? "opacity-100" : "opacity-0")
        }
        onClick={onClose}
      />
      <aside
        className={
          "absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-200 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
        role="dialog"
        aria-label="My documents"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-navy">My documents</h2>
            <p className="text-xs text-slate-500">Pick up where you left off.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="px-2 py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : drafts.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-400">
              No saved documents yet. Start a chat and save your first draft.
            </p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((draft) => (
                <li
                  key={draft.id}
                  className={
                    "group flex items-start justify-between gap-2 rounded-lg border p-3 transition " +
                    (draft.id === activeId
                      ? "border-brand-blue/50 bg-brand-blue/5"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")
                  }
                >
                  <button
                    type="button"
                    onClick={() => onOpen(draft.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-navy">
                      {draft.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                      <span>Updated {formatWhen(draft.updatedAt)}</span>
                      {draft.complete ? (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-brand-yellow/20 px-1.5 py-0.5 font-medium text-brand-yellow">
                          Draft
                        </span>
                      )}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(draft.id)}
                    className="shrink-0 rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    aria-label={`Delete ${draft.title}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 7h14M10 7V5h4v2m-6 0 .7 12h6.6L16 7"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
