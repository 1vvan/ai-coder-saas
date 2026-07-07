// Client + types for the multi-document engine (PL-5).
//
// The backend registry (documents.py) is the single source of truth for which
// document types exist and which fields each one needs. The frontend fetches
// that registry and renders forms/previews from it, and fetches each type's
// verbatim Standard Terms for the document body.

import { API_BASE, authFetch } from "@/lib/session";

export type FieldKind = "text" | "textarea" | "date" | "select" | "number";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  options?: string[];
  help?: string;
}

export interface DocumentType {
  slug: string;
  title: string;
  description: string;
  partyRoles: string[];
  fields: FieldDef[];
}

export interface TermBlock {
  level: number;
  number: string;
  heading: string;
  text: string;
}

export interface PartyInfo {
  role?: string;
  printName?: string;
  title?: string;
  company?: string;
  noticeAddress?: string;
}

export interface FieldValue {
  key: string;
  value: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiResponse {
  reply: string;
  documentType: string | null;
  unsupported: boolean;
  suggestedType: string | null;
  fields: FieldValue[];
  parties: PartyInfo[];
  complete: boolean;
}

export async function fetchDocumentTypes(): Promise<DocumentType[]> {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error(`Failed to load document types (${res.status})`);
  return (await res.json()).documentTypes;
}

export async function fetchTerms(
  slug: string,
): Promise<{ title: string; terms: TermBlock[] }> {
  const res = await fetch(`${API_BASE}/api/documents/${slug}/terms`);
  if (!res.ok) throw new Error(`Failed to load terms (${res.status})`);
  return res.json();
}

export async function sendChat(
  messages: ChatMessage[],
  documentType: string | null,
  values: Record<string, string>,
  parties: PartyInfo[],
): Promise<ChatApiResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      documentType,
      fields: Object.entries(values).map(([key, value]) => ({ key, value })),
      parties,
    }),
  });
  if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
  return res.json();
}

/** Merge AI-extracted field values onto the current values, ignoring blanks. */
export function mergeValues(
  current: Record<string, string>,
  patch: FieldValue[],
): Record<string, string> {
  const next = { ...current };
  for (const { key, value } of patch) {
    if (value != null && value !== "") next[key] = value;
  }
  return next;
}

const PARTY_KEYS = ["printName", "title", "company", "noticeAddress"] as const;

/** Merge AI-extracted parties onto the current ones, keyed by role and schema order. */
export function mergeParties(
  current: PartyInfo[],
  patch: PartyInfo[],
  roles: string[],
): PartyInfo[] {
  const byRole = new Map<string, PartyInfo>();
  roles.forEach((role) => byRole.set(role, { role }));
  for (const party of current) {
    if (party.role) byRole.set(party.role, { ...byRole.get(party.role), ...party });
  }
  for (const party of patch) {
    if (!party.role) continue;
    const merged = { ...(byRole.get(party.role) ?? { role: party.role }) };
    for (const key of PARTY_KEYS) {
      if (party[key]) merged[key] = party[key];
    }
    byRole.set(party.role, merged);
  }
  return roles.map((role) => byRole.get(role) ?? { role });
}

// --- Saved documents / drafts (PL-6) --------------------------------------

export interface DocumentSummary {
  id: number;
  docType: string;
  title: string;
  complete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDocument extends DocumentSummary {
  fields: FieldValue[];
  parties: PartyInfo[];
}

export interface SaveDraftInput {
  id?: number;
  documentType: string;
  title?: string;
  values: Record<string, string>;
  parties: PartyInfo[];
  complete: boolean;
}

export async function listDrafts(): Promise<DocumentSummary[]> {
  const res = await authFetch("/api/drafts");
  if (!res.ok) throw new Error(`Failed to load your documents (${res.status})`);
  return res.json();
}

export async function saveDraft(input: SaveDraftInput): Promise<SavedDocument> {
  const res = await authFetch("/api/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.id,
      documentType: input.documentType,
      title: input.title,
      fields: Object.entries(input.values).map(([key, value]) => ({ key, value })),
      parties: input.parties,
      complete: input.complete,
    }),
  });
  if (!res.ok) throw new Error(`Failed to save (${res.status})`);
  return res.json();
}

export async function getDraft(id: number): Promise<SavedDocument> {
  const res = await authFetch(`/api/drafts/${id}`);
  if (!res.ok) throw new Error(`Failed to open document (${res.status})`);
  return res.json();
}

export async function deleteDraft(id: number): Promise<void> {
  const res = await authFetch(`/api/drafts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
}

/** Convert a saved document's flat field list back into a values record. */
export function valuesFromFields(fields: FieldValue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of fields) out[key] = value;
  return out;
}
