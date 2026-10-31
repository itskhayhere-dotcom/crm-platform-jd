/**
 * GoogleSheetsAdapter — the default backup store.
 *
 * Writes pipeline data to a Google Sheet via a service account (server-side only; the
 * key never reaches the browser or the mobile app). Two tabs:
 *   Clients: id | name | data(JSON) | owner | createdAt | updatedAt
 *   Entries: id | clientId | stage | data(JSON) | createdBy | createdAt | updatedAt
 *
 * Stage-specific fields are stored in the JSON `data` column so changing fields in
 * crm.config.ts never changes the sheet's columns. (If you'd rather have one column per
 * field for easy human editing, flatten `data` on write and re-hydrate on read — the
 * row<->object mapping is isolated to `toRow`/`fromRow` below.)
 *
 * Note on scale: this adapter reads a tab to find a row before updating it. That is fine
 * for a small team's CRM. Past a few thousand rows, move to a real database adapter
 * (same interface) — see index.ts.
 */

import { google, type sheets_v4 } from "googleapis";
import type { ClientRow, RecordRow } from "../types";
import type { EntryFilter, StorageAdapter } from "./adapter";

const CLIENTS = "Clients";
const ENTRIES = "Entries";
const CLIENT_HEADERS = ["id", "name", "data", "owner", "createdAt", "updatedAt"];
const ENTRY_HEADERS = ["id", "clientId", "stage", "data", "createdBy", "createdAt", "updatedAt"];

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountEmail: string;
  privateKey: string; // may contain literal "\n" sequences
}

export class GoogleSheetsAdapter implements StorageAdapter {
  private sheets: sheets_v4.Sheets;
  private id: string;

  constructor(cfg: GoogleSheetsConfig) {
    this.id = cfg.spreadsheetId;
    const auth = new google.auth.JWT({
      email: cfg.serviceAccountEmail,
      key: cfg.privateKey.replace(/\\n/g, "\n"), // tolerate escaped newlines from .env
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  /** Ensure both tabs exist and carry a header row. */
  async init(): Promise<void> {
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.id });
    const existing = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title));
    for (const [title, headers] of [
      [CLIENTS, CLIENT_HEADERS],
      [ENTRIES, ENTRY_HEADERS],
    ] as const) {
      if (!existing.has(title)) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.id,
          requestBody: { requests: [{ addSheet: { properties: { title } } }] },
        });
        await this.write(`${title}!A1`, [headers as unknown as string[]]);
      }
    }
  }

  // ── Clients ────────────────────────────────────────────────────────────────
  async listClients(): Promise<ClientRow[]> {
    const rows = await this.read(CLIENTS);
    return rows.map(clientFromRow);
  }

  async getClient(id: string): Promise<ClientRow | null> {
    return (await this.listClients()).find((c) => c.id === id) ?? null;
  }

  async upsertClient(client: ClientRow): Promise<ClientRow> {
    const index = await this.rowIndex(CLIENTS, client.id);
    const row = clientToRow(client);
    if (index === -1) await this.append(CLIENTS, row);
    else await this.write(`${CLIENTS}!A${index + 2}`, [row]); // +2: header + 1-based
    return client;
  }

  // ── Entries ──────────────────────────────────────────────────────────────
  async listEntries(filter: EntryFilter = {}): Promise<RecordRow[]> {
    let rows = (await this.read(ENTRIES)).map(entryFromRow);
    if (filter.clientId) rows = rows.filter((r) => r.clientId === filter.clientId);
    if (filter.stage) rows = rows.filter((r) => r.stage === filter.stage);
    return rows;
  }

  async getEntry(id: string): Promise<RecordRow | null> {
    return (await this.listEntries()).find((r) => r.id === id) ?? null;
  }

  async createEntry(entry: RecordRow): Promise<RecordRow> {
    await this.append(ENTRIES, entryToRow(entry));
    return entry;
  }

  async updateEntry(id: string, patch: Partial<RecordRow>): Promise<RecordRow> {
    const index = await this.rowIndex(ENTRIES, id);
    if (index === -1) throw new Error(`Entry ${id} not found`);
    const current = (await this.listEntries()).find((r) => r.id === id)!;
    const next: RecordRow = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
    await this.write(`${ENTRIES}!A${index + 2}`, [entryToRow(next)]);
    return next;
  }

  async deleteEntry(id: string): Promise<void> {
    // Soft handling: blank the row's data and mark it. (Hard row deletion needs the
    // sheetId + a deleteDimension request; blanking keeps ids stable for audit.)
    const index = await this.rowIndex(ENTRIES, id);
    if (index === -1) return;
    await this.write(`${ENTRIES}!A${index + 2}`, [[id, "", "deleted", "{}", "", "", new Date().toISOString()]]);
  }

  // ── low-level sheet helpers ────────────────────────────────────────────────
  private async read(tab: string): Promise<string[][]> {
    const res = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.id, range: tab });
    const [, ...body] = res.data.values ?? []; // drop header
    return body as string[][];
  }
  private async write(range: string, values: string[][]): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.id, range, valueInputOption: "RAW", requestBody: { values },
    });
  }
  private async append(tab: string, row: string[]): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.id, range: tab, valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS", requestBody: { values: [row] },
    });
  }
  private async rowIndex(tab: string, id: string): Promise<number> {
    const rows = await this.read(tab);
    return rows.findIndex((r) => r[0] === id);
  }
}

// ── row <-> object mapping (the only place that knows the column order) ────────
function clientToRow(c: ClientRow): string[] {
  return [c.id, c.name, JSON.stringify(c.data ?? {}), c.owner, c.createdAt, c.updatedAt];
}
function clientFromRow(r: string[]): ClientRow {
  return { id: r[0], name: r[1], data: safeJson(r[2]), owner: r[3], createdAt: r[4], updatedAt: r[5] };
}
function entryToRow(e: RecordRow): string[] {
  return [e.id, e.clientId, e.stage, JSON.stringify(e.data ?? {}), e.createdBy, e.createdAt, e.updatedAt];
}
function entryFromRow(r: string[]): RecordRow {
  return { id: r[0], clientId: r[1], stage: r[2], data: safeJson(r[3]), createdBy: r[4], createdAt: r[5], updatedAt: r[6] };
}
function safeJson(s: string | undefined): Record<string, unknown> {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}
