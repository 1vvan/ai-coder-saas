// Session handling for real user accounts (PL-6).
//
// A signed-in session is an opaque bearer token plus the user's email, kept in
// localStorage and exposed as an external store so components stay in sync
// (including across tabs). All authenticated API calls go through `authFetch`,
// which attaches the token.

import { useSyncExternalStore } from "react";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const STORAGE_KEY = "prelegal_session";

export interface Session {
  token: string;
  email: string;
}

let listeners: Array<() => void> = [];
// Cache the parsed session so getSnapshot returns a stable reference (required
// by useSyncExternalStore to avoid render loops).
let cached: Session | null = null;
let cachedRaw: string | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Session | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

function getServerSnapshot(): Session | null {
  return null;
}

/** React hook: the current session, or null. Kept in sync across tabs. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function setSession(session: Session): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
}

export function getToken(): string | null {
  return getSnapshot()?.token ?? null;
}

/** Clear the local session (and best-effort tell the backend to drop it). */
export function signOut(): void {
  const token = getToken();
  if (token) {
    void fetch(`${API_BASE}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}

async function authRequest(
  path: "/api/signup" | "/api/login",
  email: string,
  password: string,
): Promise<Session> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.detail || "Something went wrong. Please try again.");
  }
  const session: Session = { token: body.token, email: body.email };
  setSession(session);
  return session;
}

export function signUp(email: string, password: string): Promise<Session> {
  return authRequest("/api/signup", email, password);
}

export function signIn(email: string, password: string): Promise<Session> {
  return authRequest("/api/login", email, password);
}

/** fetch() with the bearer token attached. Signs the user out on a 401. */
export async function authFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    window.localStorage.removeItem(STORAGE_KEY);
    notify();
  }
  return res;
}
