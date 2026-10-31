/**
 * auth.ts — verifies the caller's token and returns the user, for the shared API.
 *
 * This is the ONLY file that knows about the auth provider (Clerk). Swap providers by
 * rewriting `getAuthUser` to verify their token; the API routes don't change.
 *
 * Web and mobile both send `Authorization: Bearer <token>` where the token is the
 * Clerk session token issued to the signed-in user — the same account on either client.
 */

import { verifyToken } from "@clerk/backend";
import type { AuthUser } from "@crm/core";

export class Unauthorized extends Error {
  status = 401 as const;
  constructor(msg = "Unauthorized") { super(msg); }
}

export async function getAuthUser(req: Request): Promise<AuthUser> {
  // Local-dev escape hatch (never in production): trust an x-dev-user header.
  if (process.env.DEV_AUTH_BYPASS === "1") {
    const id = req.headers.get("x-dev-user") || "dev-user";
    return { id, email: `${id}@dev.local` };
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new Unauthorized("Missing bearer token");

  try {
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    return {
      id: claims.sub,                       // stable Clerk user id
      orgId: (claims as Record<string, unknown>).org_id as string | undefined,
      email: (claims as Record<string, unknown>).email as string | undefined,
    };
  } catch {
    throw new Unauthorized("Invalid token");
  }
}
