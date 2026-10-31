/**
 * /api/clients — list and create client records. Config-driven like /api/records:
 * required fields come from crmConfig.clientFields, so adding a client field is a
 * config change only. Shared by web and mobile.
 *
 *   GET  /api/clients            → ClientRow[]
 *   POST /api/clients  { ...clientFields } → ClientRow
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getStorage } from "@crm/core/storage";
import type { ClientRow } from "@crm/core";
import crmConfig from "../../../../../crm.config";
import { getAuthUser, Unauthorized } from "../../../lib/auth";

export async function GET(req: Request) {
  try {
    await getAuthUser(req);
    const clients = await (await getStorage()).listClients();
    return NextResponse.json(clients);
  } catch (e) { return err(e); }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    const data = (await req.json()) as Record<string, unknown>;

    const missing = crmConfig.clientFields
      .filter((f) => f.required && isBlank(data[f.key]))
      .map((f) => f.label);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required: ${missing.join(", ")}` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const client: ClientRow = {
      id: randomUUID(),
      name: String(data.name ?? "Untitled"),
      data,
      owner: user.id,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await (await getStorage()).upsertClient(client);
    return NextResponse.json(saved, { status: 201 });
  } catch (e) { return err(e); }
}

function isBlank(v: unknown) { return v === undefined || v === null || v === ""; }
function err(e: unknown) {
  if (e instanceof Unauthorized) return NextResponse.json({ error: e.message }, { status: 401 });
  return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
}
