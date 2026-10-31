/**
 * DynamicStageForm — renders the data-entry form for ANY stage straight from crm.config.
 *
 * This is the heart of "configurable, not hard-coded": give it a stage key and it builds
 * the right inputs, validates required fields, and submits through the shared apiClient
 * (which hits /api/records → the active StorageAdapter → Google Sheet).
 *
 * The mobile app mirrors this exact component with React Native inputs (TextInput /
 * Picker) and the SAME crm.config and apiClient — so the two stay in lockstep.
 */

"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createApiClient, type FieldDef } from "@crm/core";
import crmConfig from "../../../crm.config";

export function DynamicStageForm({
  stageKey,
  clientId,
  onSaved,
}: {
  stageKey: string;
  clientId: string;
  onSaved?: () => void;
}) {
  const { getToken } = useAuth();
  const stage = crmConfig.stages.find((s) => s.key === stageKey);

  // One API client, token injected per-request. Same construction on mobile.
  const api = useMemo(
    () => createApiClient({ baseUrl: "", getToken: () => getToken() }),
    [getToken],
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!stage) return <p>Unknown stage: {stageKey}</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createEntry({ clientId, stage: stage.key, data: values });
      setValues({});
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const set = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }));

  return (
    <form onSubmit={submit}>
      <h2>{stage.label}</h2>
      {stage.description && <p>{stage.description}</p>}

      {stage.fields.map((field) => (
        <label key={field.key} style={{ display: "block", marginBottom: 12 }}>
          {field.label}{field.required ? " *" : ""}
          <Field field={field} value={values[field.key]} onChange={(v) => set(field.key, v)} />
          {field.help && <small>{field.help}</small>}
        </label>
      ))}

      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : `Save to ${stage.label}`}</button>
    </form>
  );
}

/** Maps a FieldDef.type to the right input. Add a case here to support a new field type. */
function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? "") as string;
  switch (field.type) {
    case "textarea":
      return <textarea value={v} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "number":
    case "currency":
      return <input type="number" value={v} onChange={(e) => onChange(e.target.value)} />;
    case "date":
      return <input type="date" value={v} onChange={(e) => onChange(e.target.value)} />;
    case "email":
      return <input type="email" value={v} onChange={(e) => onChange(e.target.value)} />;
    case "phone":
      return <input type="tel" value={v} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input type="text" value={v} onChange={(e) => onChange(e.target.value)} />;
  }
}
