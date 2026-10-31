/**
 * /api/records — the shared, stage-based data-entry API (list + create).
 *
 * Both the website and the mobile app call this. It is backend-agnostic: it validates
 * against crm.config and then calls whatever StorageAdapter is live (Google Sheets by
 * default), so "sync to storage" happens here, once, for every client.
 *
 *   GET  /api/records?clientId=&stage=   → RecordRow[]
 *   POST /api/records  { clientId, stage, data } → RecordRow
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getStorage } from "@crm/core";
import type { RecordRow } from "@crm/core";
import crmConfig from "../../../../../crm.config";
import { getAuthUser, Unauthorized } from "../../../lib/auth";

export async function GET(req: Request) {
  try {
    await getAuthUser(req); // any signed-in user may read
    const url = new URL(req.url);
    const storage = await getStorage();
    const rows = await storage.listEntries({
      clientId: url.searchParams.get("clientId") ?? undefined,
      stage: url.searchParams.get("stage") ?? undefined,
    });
    return NextResponse.json(rows);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    const body = (await req.json()) as { clientId?: string; stage?: string; data?: Record<string, unknown> };

    const stage = crmConfig.stages.find((s) => s.key === body.stage);
    if (!body.clientId || !stage) {
      return NextResponse.json({ error: "clientId and a valid stage are required" }, { status: 400 });
    }

    // Validate the submitted data against THIS stage's configured fields.
    const data = body.data ?? {};
    const missing = stage.fields.filter((f) => f.required && isBlank(data[f.key])).map((f) => f.label);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required: ${missing.join(", ")}` }, { status: 400 });
    }
    // Keep only keys the stage defines (ignore anything extra the client sent).
    const clean: Record<string, unknown> = {};
    for (const f of stage.fields) if (f.key in data) clean[f.key] = data[f.key];

    const now = new Date().toISOString();
    const entry: RecordRow = {
      id: randomUUID(),
      clientId: body.clientId,
      stage: stage.key,
      data: clean,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    const storage = await getStorage();
    const saved = await storage.createEntry(entry); // ← syncs to Google Sheet (or active store)
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

function isBlank(v: unknown) { return v === undefined || v === null || v === ""; }

function errorResponse(e: unknown) {
  if (e instanceof Unauthorized) return NextResponse.json({ error: e.message }, { status: 401 });
  const message = e instanceof Error ? e.message : "Server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
