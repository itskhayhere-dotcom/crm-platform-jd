/**
 * Storage factory — the single place that decides which adapter is live.
 *
 * Switch backends with the STORAGE_DRIVER env var; add a new store by adding one case.
 * Nothing else in the codebase imports a concrete adapter, so swapping is a one-file
 * change here plus the new adapter file.
 *
 *   STORAGE_DRIVER=sheets   → Google Sheets (default, production)
 *   STORAGE_DRIVER=memory   → in-process (dev/tests)
 *   STORAGE_DRIVER=airtable → your AirtableAdapter (example of extending)
 */

import type { StorageAdapter } from "./adapter";
import { GoogleSheetsAdapter } from "./googleSheets";
import { MemoryAdapter } from "./memory";

export * from "./adapter";

let singleton: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (singleton) return singleton;

  const driver = process.env.STORAGE_DRIVER ?? "sheets";
  switch (driver) {
    case "memory":
      singleton = new MemoryAdapter();
      break;

    case "sheets":
      singleton = new GoogleSheetsAdapter({
        spreadsheetId: required("GOOGLE_SHEETS_SPREADSHEET_ID"),
        serviceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
        privateKey: required("GOOGLE_PRIVATE_KEY"),
      });
      break;

    // case "airtable":
    //   singleton = new AirtableAdapter({ apiKey: required("AIRTABLE_API_KEY"), baseId: required("AIRTABLE_BASE_ID") });
    //   break;

    default:
      throw new Error(`Unknown STORAGE_DRIVER "${driver}"`);
  }

  await singleton.init();
  return singleton;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}
