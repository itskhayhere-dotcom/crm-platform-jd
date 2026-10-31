/**
 * Dashboard page (web shell).
 *
 * Signed out → a sign-in button (Clerk).
 * Signed in  → pick/add a client, choose a stage, and submit entries via the SAME
 * config-driven DynamicStageForm and apiClient the mobile app uses. This is a minimal,
 * working shell to prove the end-to-end flow; style it with your design system next.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { createApiClient, type ClientRow } from "@crm/core";
import crmConfig from "../../../crm.config";
import { DynamicStageForm } from "../components/DynamicStageForm";

export default function Home() {
  return (
    <main>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{crmConfig.product}</h1>
        <SignedIn><UserButton /></SignedIn>
      </header>

      <SignedOut>
        <p>Sign in to manage your pipeline. The same account works in the mobile app.</p>
        <SignInButton mode="modal"><button>Sign in</button></SignInButton>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}

function Dashboard() {
  const { getToken } = useAuth();
  const api = useMemo(() => createApiClient({ baseUrl: "", getToken: () => getToken() }), [getToken]);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [stage, setStage] = useState<string>(crmConfig.stages[0].key);
  const [newName, setNewName] = useState("");

  async function loadClients() {
    const list = await api.listClients();
    setClients(list);
    if (!clientId && list[0]) setClientId(list[0].id);
  }
  useEffect(() => { loadClients().catch(console.error); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addClient() {
    if (!newName.trim()) return;
    const c = await api.createClient({ name: newName.trim() });
    setNewName("");
    setClientId(c.id);
    loadClients();
  }

  return (
    <section>
      <h2>Clients</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="New client name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button onClick={addClient}>Add client</button>
      </div>

      <h2 style={{ marginTop: 24 }}>Add a pipeline entry</h2>
      <label>
        Stage{" "}
        <select value={stage} onChange={(e) => setStage(e.target.value)}>
          {crmConfig.stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>

      {clientId
        ? <DynamicStageForm stageKey={stage} clientId={clientId} onSaved={() => alert("Saved to storage")} />
        : <p>Add a client first.</p>}
    </section>
  );
}
