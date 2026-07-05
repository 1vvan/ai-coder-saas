// Fake session handling for the V1 foundation (PL-3).
//
// There is no real authentication yet: any non-empty email/password brings the
// user into the platform. The "session" is just the email kept in localStorage
// (exposed as an external store so components stay in sync), and the backend
// records the login in the temporary database (best-effort).

import { useSyncExternalStore } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const STORAGE_KEY = "prelegal_user";

let listeners: Array<() => void> = [];

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

function getSnapshot(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

/** React hook: the current signed-in email, or null. Kept in sync across tabs. */
export function useStoredEmail(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setStoredEmail(email: string): void {
  window.localStorage.setItem(STORAGE_KEY, email);
  notify();
}

export function clearStoredEmail(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}

/** Record the (fake) login in the backend's temp DB. Never blocks entry. */
export async function login(email: string, password: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // A backend/DB hiccup must not lock the user out of a fake login.
  }
}
