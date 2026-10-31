/**
 * MemoryAdapter — an in-process store for local dev and tests.
 *
 * Proves the swap point works: it implements the exact same StorageAdapter interface as
 * GoogleSheetsAdapter, so the API behaves identically against it. Data is lost on
 * restart — never use it in production.
 */

import type { ClientRow, RecordRow } from "../types";
import type { EntryFilter, StorageAdapter } from "./adapter";

export class MemoryAdapter implements StorageAdapter {
  private clients = new Map<string, ClientRow>();
  private entries = new Map<string, RecordRow>();

  async init(): Promise<void> {}

  async listClients() { return [...this.clients.values()]; }
  async getClient(id: string) { return this.clients.get(id) ?? null; }
  async upsertClient(client: ClientRow) { this.clients.set(client.id, client); return client; }

  async listEntries(filter: EntryFilter = {}) {
    return [...this.entries.values()].filter(
      (r) => (!filter.clientId || r.clientId === filter.clientId) &&
             (!filter.stage || r.stage === filter.stage),
    );
  }
  async getEntry(id: string) { return this.entries.get(id) ?? null; }
  async createEntry(entry: RecordRow) { this.entries.set(entry.id, entry); return entry; }
  async updateEntry(id: string, patch: Partial<RecordRow>) {
    const cur = this.entries.get(id);
    if (!cur) throw new Error(`Entry ${id} not found`);
    const next = { ...cur, ...patch, id, updatedAt: new Date().toISOString() };
    this.entries.set(id, next);
    return next;
  }
  async deleteEntry(id: string) { this.entries.delete(id); }
}
