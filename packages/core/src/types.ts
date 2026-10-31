/**
 * Shared types used by the config, the storage adapters, the API, and both front ends.
 * Import these from `@crm/core` so web and mobile agree on the shape of everything.
 */

/** A single input in a form, described as data so the UI can render it generically. */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "phone"
  | "email";

export interface FieldDef {
  key: string;            // stored under this key in the record's `data`
  label: string;          // shown to the user
  type: FieldType;
  required?: boolean;
  options?: string[];     // for type: "select"
  help?: string;          // optional helper text
}

/** One pipeline stage and the fields it collects. */
export interface StageDef {
  key: string;
  label: string;
  description?: string;
  fields: FieldDef[];
}

/** The whole configurable CRM definition (see crm.config.ts). */
export interface CrmConfig {
  product: string;
  currency: string;
  clientFields: FieldDef[];
  stages: StageDef[];
}

/** A client record (one per customer/company). */
export interface ClientRow {
  id: string;
  name: string;
  data: Record<string, unknown>; // values for clientFields
  owner: string;                 // userId who created it
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
}

/** One pipeline entry: a client's data at a given stage. */
export interface RecordRow {
  id: string;
  clientId: string;
  stage: string;                 // StageDef.key
  data: Record<string, unknown>; // values for that stage's fields
  createdBy: string;             // userId
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
}

/** The authenticated caller, as resolved from the request's token. */
export interface AuthUser {
  id: string;
  orgId?: string;
  email?: string;
}
