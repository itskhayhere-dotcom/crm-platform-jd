/**
 * apiClient — the ONE client both the website and the mobile app use to talk to the
 * shared API. Each platform injects its own `baseUrl` and `getToken` (Clerk gives a
 * token on web and on mobile), so the calling code is identical everywhere.
 *
 *   // web:    createApiClient({ baseUrl: "", getToken: () => getClerkToken() })
 *   // mobile: createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL!, getToken })
 */

import type { ClientRow, RecordRow } from "./types";

export interface ApiClientOptions {
  baseUrl: string;                       // "" on web (same origin), full URL on mobile
  getToken: () => Promise<string | null>; // returns the signed-in user's token
}

export interface NewEntry {
  clientId: string;
  stage: string;
  data: Record<string, unknown>;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${body || res.statusText}`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  return {
    // Clients
    listClients: () => call<ClientRow[]>("/api/clients"),
    createClient: (data: Record<string, unknown>) =>
      call<ClientRow>("/api/clients", { method: "POST", body: JSON.stringify(data) }),

    // Pipeline entries (stage-based data entry)
    listEntries: (filter: { clientId?: string; stage?: string } = {}) => {
      const q = new URLSearchParams(filter as Record<string, string>).toString();
      return call<RecordRow[]>(`/api/records${q ? `?${q}` : ""}`);
    },
    createEntry: (entry: NewEntry) =>
      call<RecordRow>("/api/records", { method: "POST", body: JSON.stringify(entry) }),
    updateEntry: (id: string, data: Record<string, unknown>) =>
      call<RecordRow>(`/api/records/${id}`, { method: "PATCH", body: JSON.stringify({ data }) }),
    deleteEntry: (id: string) => call<void>(`/api/records/${id}`, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
