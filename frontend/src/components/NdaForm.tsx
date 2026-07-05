"use client";

import type { NdaFormData, Party } from "@/lib/nda";

interface NdaFormProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
const labelClass = "block text-sm font-medium text-slate-700";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-slate-200 pb-6 last:border-none last:pb-0">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PartyFields({
  party,
  legend,
  idPrefix,
  onChange,
}: {
  party: Party;
  legend: string;
  idPrefix: string;
  onChange: (party: Party) => void;
}) {
  const set = (key: keyof Party) => (value: string) =>
    onChange({ ...party, [key]: value });

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-800">{legend}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Print name" htmlFor={`${idPrefix}-name`}>
          <input
            id={`${idPrefix}-name`}
            className={fieldClass}
            value={party.printName}
            onChange={(e) => set("printName")(e.target.value)}
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Title" htmlFor={`${idPrefix}-title`}>
          <input
            id={`${idPrefix}-title`}
            className={fieldClass}
            value={party.title}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="CEO"
          />
        </Field>
        <Field label="Company" htmlFor={`${idPrefix}-company`}>
          <input
            id={`${idPrefix}-company`}
            className={fieldClass}
            value={party.company}
            onChange={(e) => set("company")(e.target.value)}
            placeholder="Acme, Inc."
          />
        </Field>
        <Field label="Notice address (email or postal)" htmlFor={`${idPrefix}-address`}>
          <input
            id={`${idPrefix}-address`}
            className={fieldClass}
            value={party.noticeAddress}
            onChange={(e) => set("noticeAddress")(e.target.value)}
            placeholder="legal@acme.com"
          />
        </Field>
      </div>
    </fieldset>
  );
}

export default function NdaForm({ data, onChange }: NdaFormProps) {
  const set = <K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Section
        title="Agreement details"
        description="The key information that fills in the NDA."
      >
        <Field label="Purpose" htmlFor="purpose">
          <textarea
            id="purpose"
            className={`${fieldClass} min-h-20 resize-y`}
            value={data.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="How Confidential Information may be used"
          />
        </Field>

        <Field label="Effective date" htmlFor="effectiveDate">
          <input
            id="effectiveDate"
            type="date"
            className={fieldClass}
            value={data.effectiveDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Governing law (state)" htmlFor="governingLaw">
            <input
              id="governingLaw"
              className={fieldClass}
              value={data.governingLaw}
              onChange={(e) => set("governingLaw", e.target.value)}
              placeholder="Delaware"
            />
          </Field>
          <Field label="Jurisdiction (city/county, state)" htmlFor="jurisdiction">
            <input
              id="jurisdiction"
              className={fieldClass}
              value={data.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
              placeholder="New Castle, DE"
            />
          </Field>
        </div>
      </Section>

      <Section title="MNDA term" description="How long this agreement lasts.">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="ndaTermKind"
              checked={data.ndaTermKind === "expires"}
              onChange={() => set("ndaTermKind", "expires")}
            />
            Expires
            <input
              type="number"
              min={1}
              className={`${fieldClass} w-20`}
              value={data.ndaTermYears}
              onChange={(e) => set("ndaTermYears", Number(e.target.value))}
              disabled={data.ndaTermKind !== "expires"}
            />
            year(s) from the Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="ndaTermKind"
              checked={data.ndaTermKind === "untilTerminated"}
              onChange={() => set("ndaTermKind", "untilTerminated")}
            />
            Continues until terminated
          </label>
        </div>
      </Section>

      <Section
        title="Term of confidentiality"
        description="How long Confidential Information stays protected."
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="confidentialityKind"
              checked={data.confidentialityKind === "years"}
              onChange={() => set("confidentialityKind", "years")}
            />
            <input
              type="number"
              min={1}
              className={`${fieldClass} w-20`}
              value={data.confidentialityYears}
              onChange={(e) =>
                set("confidentialityYears", Number(e.target.value))
              }
              disabled={data.confidentialityKind !== "years"}
            />
            year(s) from the Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="confidentialityKind"
              checked={data.confidentialityKind === "perpetuity"}
              onChange={() => set("confidentialityKind", "perpetuity")}
            />
            In perpetuity
          </label>
        </div>
      </Section>

      <Section title="Parties">
        <PartyFields
          party={data.party1}
          legend="Party 1"
          idPrefix="party1"
          onChange={(party) => set("party1", party)}
        />
        <PartyFields
          party={data.party2}
          legend="Party 2"
          idPrefix="party2"
          onChange={(party) => set("party2", party)}
        />
      </Section>

      <Section
        title="Modifications"
        description="Optional changes to the Standard Terms."
      >
        <Field label="MNDA modifications" htmlFor="modifications">
          <textarea
            id="modifications"
            className={`${fieldClass} min-h-16 resize-y`}
            value={data.modifications}
            onChange={(e) => set("modifications", e.target.value)}
            placeholder="None"
          />
        </Field>
      </Section>
    </form>
  );
}
