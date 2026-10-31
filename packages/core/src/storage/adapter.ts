/**
 * StorageAdapter — the ONE boundary the rest of the system depends on.
 *
 * The API never talks to Google Sheets (or any store) directly; it talks to this
 * interface. To back the CRM with Postgres, Airtable, Supabase, etc., write a new
 * class that implements StorageAdapter and register it in `index.ts`. No API, config,
 * or UI code changes — that is the whole point of this file.
 */

import type { ClientRow, RecordRow } from "../types";

export interface EntryFilter {
  clientId?: string;
  stage?: string;
}

export interface StorageAdapter {
  /** Create tables/tabs/headers if missing. Safe to call on every cold start. */
  init(): Promise<void>;

  // ── Clients ──────────────────────────────────────────────────────────────
  listClients(): Promise<ClientRow[]>;
  getClient(id: string): Promise<ClientRow | null>;
  /** Insert or update a client (matched by id). Returns the saved row. */
  upsertClient(client: ClientRow): Promise<ClientRow>;

  // ── Pipeline entries ─────────────────────────────────────────────────────
  listEntries(filter?: EntryFilter): Promise<RecordRow[]>;
  getEntry(id: string): Promise<RecordRow | null>;
  createEntry(entry: RecordRow): Promise<RecordRow>;
  updateEntry(id: string, patch: Partial<RecordRow>): Promise<RecordRow>;
  deleteEntry(id: string): Promise<void>;
}
