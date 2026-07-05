// Small client helper for talking to the FastAPI backend.
//
// In the Docker image the frontend is served by FastAPI from the same origin,
// so an empty base makes the browser call relative `/api/*` URLs. During local
// dev the backend runs on a different port, so set NEXT_PUBLIC_API_BASE (e.g.
// http://localhost:8000).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export type User = {
  id: number;
  name: string;
  email: string | null;
  createdAt: string;
};

/** Fake login: hand the backend a name and get a user back. No password. */
export async function login(name: string, email?: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email: email || undefined }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }
  return (await res.json()) as User;
}
