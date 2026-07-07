"use client";

import type { DocumentType, FieldDef, PartyInfo } from "@/lib/documents";

interface DocumentFormProps {
  doc: DocumentType;
  values: Record<string, string>;
  parties: PartyInfo[];
  onChangeValues: (values: Record<string, string>) => void;
  onChangeParties: (parties: PartyInfo[]) => void;
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25";
const labelClass = "block text-sm font-medium text-slate-700";

const PARTY_FIELDS: Array<{ key: keyof PartyInfo; label: string; placeholder: string }> = [
  { key: "printName", label: "Print name", placeholder: "Jane Doe" },
  { key: "title", label: "Title", placeholder: "CEO" },
  { key: "company", label: "Company", placeholder: "Acme, Inc." },
  { key: "noticeAddress", label: "Notice address", placeholder: "legal@acme.com" },
];

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;
  if (field.kind === "textarea") {
    return (
      <textarea
        id={id}
        className={`${fieldClass} min-h-20 resize-y`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.help}
      />
    );
  }
  if (field.kind === "select") {
    return (
      <select
        id={id}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
      className={fieldClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.help}
    />
  );
}

export default function DocumentForm({
  doc,
  values,
  parties,
  onChangeValues,
  onChangeParties,
}: DocumentFormProps) {
  const setField = (key: string, value: string) =>
    onChangeValues({ ...values, [key]: value });

  const setParty = (index: number, key: keyof PartyInfo, value: string) => {
    const next = doc.partyRoles.map((role, i) => ({
      ...(parties[i] ?? { role }),
      role,
    }));
    next[index] = { ...next[index], [key]: value };
    onChangeParties(next);
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-navy">{doc.title} details</h3>
        {doc.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label htmlFor={`field-${field.key}`} className={labelClass}>
              {field.label}
              {field.required ? "" : " (optional)"}
            </label>
            <FieldInput
              field={field}
              value={values[field.key] ?? ""}
              onChange={(v) => setField(field.key, v)}
            />
            {field.help && field.kind !== "textarea" ? (
              <p className="text-xs text-slate-400">{field.help}</p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-navy">Parties</h3>
        {doc.partyRoles.map((role, index) => (
          <fieldset key={role} className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">{role}</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PARTY_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label
                    htmlFor={`party-${index}-${key}`}
                    className={labelClass}
                  >
                    {label}
                  </label>
                  <input
                    id={`party-${index}-${key}`}
                    className={fieldClass}
                    value={parties[index]?.[key] ?? ""}
                    onChange={(e) => setParty(index, key, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </section>
    </form>
  );
}
