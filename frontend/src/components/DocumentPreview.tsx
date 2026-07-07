import type { DocumentType, PartyInfo, TermBlock } from "@/lib/documents";

interface DocumentPreviewProps {
  doc: DocumentType;
  values: Record<string, string>;
  parties: PartyInfo[];
  terms: TermBlock[];
  title: string;
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Render inline **bold** spans from the verbatim template text. */
function renderInline(text: string) {
  return text.split("**").map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-slate-900">
        {chunk}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );
}

export default function DocumentPreview({
  doc,
  values,
  parties,
  terms,
  title,
}: DocumentPreviewProps) {
  return (
    <article
      id="document-preview"
      className="mx-auto max-w-[8.5in] space-y-6 bg-white p-10 text-slate-900"
    >
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-navy">{title}</h1>
        <p className="text-sm text-slate-500">Cover Page</p>
      </header>

      <div className="rounded-md border border-brand-yellow/50 bg-brand-yellow/10 px-4 py-2.5 text-center text-xs text-navy/80">
        <strong className="font-semibold">Draft — subject to legal review.</strong>{" "}
        This document is a draft generated for convenience and is not legal
        advice. Have it reviewed by a qualified attorney before signing.
      </div>

      <dl className="space-y-4 text-sm">
        {doc.fields.map((field) => {
          const raw = values[field.key]?.trim() ?? "";
          if (!raw && !field.required) return null;
          const display =
            raw && field.kind === "date" ? formatDate(raw) : raw || `[${field.label}]`;
          return (
            <div key={field.key}>
              <dt className="font-semibold text-slate-900">{field.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-slate-700">{display}</dd>
            </div>
          );
        })}
      </dl>

      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          By signing this Cover Page, each party agrees to enter into this
          agreement as of the Effective Date.
        </p>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {doc.partyRoles.map((role, index) => {
            const party = parties[index] ?? {};
            return (
              <div key={role} className="space-y-2 text-sm">
                <div className="border-b border-slate-400 pb-6" aria-hidden />
                <p className="text-xs uppercase tracking-wide text-slate-500">{role}</p>
                <dl className="space-y-1">
                  <div>
                    <dt className="inline text-slate-500">Print name: </dt>
                    <dd className="inline text-slate-900">{party.printName || "[Name]"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">Title: </dt>
                    <dd className="inline text-slate-900">{party.title || "[Title]"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">Company: </dt>
                    <dd className="inline text-slate-900">{party.company || "[Company]"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">Notice address: </dt>
                    <dd className="inline text-slate-900">
                      {party.noticeAddress || "[Email or postal address]"}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </div>

      <section className="space-y-3 border-t border-slate-300 pt-6">
        <h2 className="text-xl font-bold text-navy">Standard Terms</h2>
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
          {terms.map((block, index) => (
            <p
              key={index}
              style={{ paddingLeft: `${block.level * 1.25}rem` }}
              className="flex gap-2"
            >
              {block.number ? (
                <span className="shrink-0 font-semibold text-slate-900">
                  {block.number}
                </span>
              ) : null}
              <span>
                {block.heading ? (
                  <span className="font-semibold text-slate-900">{block.heading} </span>
                ) : null}
                {renderInline(block.text)}
              </span>
            </p>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Based on a Common Paper {title} template, free to use under{" "}
        <span className="whitespace-nowrap">CC BY 4.0</span>{" "}
        (https://creativecommons.org/licenses/by/4.0/).
      </footer>
    </article>
  );
}
