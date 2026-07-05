// Client for the AI chat backend (PL-4).
//
// The chat lets the user describe their NDA in freeform conversation; the
// backend replies and returns any Mutual NDA fields it has extracted so far.
// Extracted fields are merged into the existing NdaFormData without clobbering
// values the AI hasn't (re)mentioned.

import type {
  ConfidentialityKind,
  NdaFormData,
  NdaTermKind,
  Party,
} from "@/lib/nda";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type PartyPatch = {
  [K in keyof Party]?: Party[K] | null;
};

// A partial NdaFormData as returned by the AI: any field may be absent or null
// when the AI hasn't learned it yet.
export interface NdaFieldsPatch {
  purpose?: string | null;
  effectiveDate?: string | null;
  ndaTermKind?: NdaTermKind | null;
  ndaTermYears?: number | null;
  confidentialityKind?: ConfidentialityKind | null;
  confidentialityYears?: number | null;
  governingLaw?: string | null;
  jurisdiction?: string | null;
  modifications?: string | null;
  party1?: PartyPatch | null;
  party2?: PartyPatch | null;
}

export interface ChatApiResponse {
  reply: string;
  fields: NdaFieldsPatch;
  complete: boolean;
}

function mergeParty(party: Party, patch?: PartyPatch | null): Party {
  if (!patch) return party;
  const next = { ...party };
  (Object.keys(next) as (keyof Party)[]).forEach((key) => {
    const value = patch[key];
    if (value !== null && value !== undefined) next[key] = value;
  });
  return next;
}

/** Apply an AI field patch onto the current form data, ignoring null/absent values. */
export function mergeFields(
  data: NdaFormData,
  patch: NdaFieldsPatch,
): NdaFormData {
  const next: NdaFormData = { ...data };
  const scalarKeys = [
    "purpose",
    "effectiveDate",
    "ndaTermKind",
    "ndaTermYears",
    "confidentialityKind",
    "confidentialityYears",
    "governingLaw",
    "jurisdiction",
    "modifications",
  ] as const;

  for (const key of scalarKeys) {
    const value = patch[key];
    if (value !== null && value !== undefined) {
      // Each key maps to a matching scalar field on NdaFormData.
      (next[key] as NdaFormData[typeof key]) = value as NdaFormData[typeof key];
    }
  }

  next.party1 = mergeParty(data.party1, patch.party1);
  next.party2 = mergeParty(data.party2, patch.party2);
  return next;
}

export async function sendChat(
  messages: ChatMessage[],
  currentFields: NdaFormData,
): Promise<ChatApiResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, currentFields }),
  });
  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status})`);
  }
  return res.json();
}
