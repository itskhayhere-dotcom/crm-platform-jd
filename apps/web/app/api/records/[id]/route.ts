/**
 * /api/records/[id] — read, update, or delete a single pipeline entry.
 * Shared by web and mobile, same auth + same storage adapter.
 *
 *   GET    /api/records/:id            → RecordRow
 *   PATCH  /api/records/:id { data }   → RecordRow (merges data; re-validates nothing
 *                                         structural, so partial saves are allowed)
 *   DELETE /api/records/:id            → 204
 */

import { NextResponse } from "next/server";
import { getStorage } from "@crm/core/storage";
import { getAuthUser, Unauthorized } from "../../../../lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    await getAuthUser(req);
    const { id } = await params;
    const row = await (await getStorage()).getEntry(id);
    return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) { return err(e); }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await getAuthUser(req);
    const { id } = await params;
    const body = (await req.json()) as { data?: Record<string, unknown> };
    const storage = await getStorage();
    const current = await storage.getEntry(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const saved = await storage.updateEntry(id, { data: { ...current.data, ...(body.data ?? {}) } });
    return NextResponse.json(saved);
  } catch (e) { return err(e); }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    await getAuthUser(req);
    const { id } = await params;
    await (await getStorage()).deleteEntry(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) { return err(e); }
}

function err(e: unknown) {
  if (e instanceof Unauthorized) return NextResponse.json({ error: e.message }, { status: 401 });
  return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
}
