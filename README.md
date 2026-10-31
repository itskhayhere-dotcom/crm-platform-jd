# CRM Platform — Web + Mobile, one backend

A configurable, stage-based CRM delivered as **one product with one backend** and two
front ends (website + mobile app) that share a single login and the same data.

This folder is the **core scaffold**: the shared backend/API, authentication wiring,
the config-driven pipeline model, and a storage layer that writes to Google Sheets by
default and can swap to a database/Airtable without touching the core logic. The full
web and mobile UIs are built on top of these pieces (the shared form component and API
client here are the pattern both front ends follow).

---

## Stack (and why)

| Layer | Choice | Why for a small team |
|-------|--------|----------------------|
| Language | **TypeScript** everywhere | One language across web, mobile, and the shared core; types catch mistakes you'd otherwise find in production. |
| Web | **Next.js (App Router)** | React (same mental model as mobile), file-based routing, and **API routes that double as the shared backend** — one deploy serves the website *and* the mobile app's API. |
| Mobile | **Expo (React Native)** | Build iOS + Android from one React codebase; shares config, types, and the API client with web. Expo keeps native build/release simple for a small team. |
| Shared code | **pnpm workspace** `packages/core` | Config, types, storage adapters, and the API client live once and are imported by both apps. "Modular and easy to extend" starts here. |
| Auth | **Clerk** (swappable) | Drop-in SDKs for **both** Next.js and Expo backed by **one user base**, so a person signs in once and the same account works on either client. The API verifies Clerk-issued tokens. See *Assumptions* to swap for Supabase/Auth.js. |
| Pipeline storage | **Google Sheets** via a **StorageAdapter** interface (swappable) | Meets the requirement literally, and the adapter boundary lets you move to Postgres/Airtable later by writing one new file. |

**Why auth is separate from pipeline storage:** usernames and passwords must never sit in
a Google Sheet. Clerk (or any real auth provider) owns identity; the Sheet only holds
**pipeline/business data**. The two are decoupled on purpose.

---

## Architecture

```
          ┌──────────────┐        ┌──────────────┐
          │  Website     │        │  Mobile app  │
          │  (Next.js)   │        │  (Expo RN)   │
          └──────┬───────┘        └──────┬───────┘
                 │  both render forms from crm.config
                 │  both sign in with Clerk (one account)
                 │  both call the SAME API with the user's token
                 └──────────────┬───────────────┘
                                ▼
                 ┌─────────────────────────────┐
                 │  Shared API (Next.js /api)   │  ← one backend
                 │  • verifies Clerk token      │
                 │  • validates against config  │
                 │  • calls StorageAdapter      │
                 └──────────────┬──────────────┘
                                ▼
                 ┌─────────────────────────────┐
                 │  StorageAdapter (interface)  │  ← swap point
                 ├─────────────────────────────┤
                 │ GoogleSheetsAdapter (default)│
                 │ MemoryAdapter (dev/tests)    │
                 │ AirtableAdapter / Postgres…  │  (add later)
                 └──────────────┬──────────────┘
                                ▼
                        Google Sheet (or other store)
```

### Data flow (creating a pipeline entry)

1. User fills a stage form on web **or** mobile. The form fields come from
   `crm.config.ts` — nothing about stages/fields is hard-coded in the UI.
2. The front end calls `POST /api/records` with the Clerk session token in the
   `Authorization` header and `{ clientId, stage, data }` in the body.
3. The API verifies the token (→ `userId`), validates `data` against that stage's
   field definitions in the config, stamps `createdBy`/timestamps, and hands a
   `RecordRow` to the active `StorageAdapter`.
4. `GoogleSheetsAdapter` appends/updates a row in the Sheet. The same record is now
   visible to both front ends on the next read.

Reads mirror this: `GET /api/records?clientId=…&stage=…` → adapter → rows.

---

## Google Sheets layout (traceable by stage and client)

Two tabs, created automatically on first run (`adapter.init()`):

**`Clients`** — one row per client
| id | name | data (JSON) | owner | createdAt | updatedAt |

**`Entries`** — one row per pipeline entry (a client at a stage)
| id | clientId | stage | data (JSON) | createdBy | createdAt | updatedAt |

- **Trace one client across the pipeline:** filter `Entries` by `clientId`.
- **Trace everyone at a stage:** filter `Entries` by `stage`.
- Stage-specific fields live in the `data` JSON column, so **adding or renaming a field
  in `crm.config.ts` never requires changing the sheet's columns**. (If you prefer one
  column per field for human editing, see the note in `googleSheets.ts`.)

---

## Client-specific customization

Everything client-facing is data in **`crm.config.ts`**: the stages, their order and
labels, the fields on each stage (type, label, required, options), and the client
record fields. To fit a new client you edit the config — not the UI or the API.

To run **different configs per client/org** (multi-tenant), load the config by
`orgId` (from the Clerk org) instead of importing the single file — see the assumption
below. The code is structured so this is a one-function change.

---

## Assumptions (defaults you can change)

1. **Auth = Clerk.** Swap by replacing `apps/web/lib/auth.ts` (token verification) and
   the client sign-in SDK. Nothing else depends on Clerk.
2. **One shared config file** (`crm.config.ts`) for all clients. For per-client configs,
   make `getConfig(orgId)` return the right one; the API and forms already take the
   config as input.
3. **Default pipeline** mirrors the Jabal Dreams stages (enquiry → quotation → ongoing
   → on-hold → completed → cancelled) and OMR currency. Edit freely.
4. **Storage = Google Sheets** via a service account (`STORAGE_DRIVER=sheets`). Set
   `STORAGE_DRIVER=memory` for local dev, or add an adapter for Postgres/Airtable.
5. **Record identity = UUID**; timestamps are ISO strings in UTC.
6. **Backend = Next.js API routes** in `apps/web`; the mobile app calls that deployed
   URL (`EXPO_PUBLIC_API_URL`).
7. The Google Sheet is **shared with the service account's email** as Editor.

---

## Setup

```bash
pnpm install
cp .env.example .env            # fill in Clerk + Google service account + sheet id
pnpm --filter web dev           # website + API on http://localhost:3000
pnpm --filter mobile start      # Expo dev client for the app
```

See `.env.example` for every required value and what it's for.

## Where to look

- `crm.config.ts` — stages, fields, labels (the thing you edit per client).
- `packages/core/src/storage/` — the swap point: `adapter.ts` (contract),
  `googleSheets.ts` (default), `memory.ts` (dev), `index.ts` (factory).
- `packages/core/src/apiClient.ts` — the one client both front ends use.
- `apps/web/app/api/records/` — the shared API (stage-based data entry + sync).
- `apps/web/components/DynamicStageForm.tsx` — renders any stage from config; mobile
  mirrors this with React Native inputs.
