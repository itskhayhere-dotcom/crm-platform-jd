/**
 * MobileStageForm — the React Native twin of the web's DynamicStageForm.
 *
 * It reads the SAME crm.config and submits through the SAME apiClient, so web and mobile
 * collect identical data and stay in lockstep when you edit the config. Only the inputs
 * differ (React Native instead of HTML).
 */
import { useMemo, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { createApiClient, type FieldDef } from "@crm/core";
import crmConfig from "../../../crm.config";

export function MobileStageForm({ stageKey, clientId }: { stageKey: string; clientId: string }) {
  const { getToken } = useAuth();
  const stage = crmConfig.stages.find((s) => s.key === stageKey);

  // baseUrl points at the deployed website that hosts /api (the shared backend).
  const api = useMemo(
    () => createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL!, getToken: () => getToken() }),
    [getToken],
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState<string | null>(null);

  if (!stage) return <Text>Unknown stage: {stageKey}</Text>;

  async function save() {
    setMsg(null);
    try {
      await api.createEntry({ clientId, stage: stage.key, data: values });
      setValues({});
      setMsg("Saved to storage");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.h2}>{stage.label}</Text>
      {stage.fields.map((f: FieldDef) => (
        <View key={f.key} style={{ marginBottom: 10 }}>
          <Text style={styles.label}>{f.label}{f.required ? " *" : ""}</Text>
          <TextInput
            style={styles.input}
            value={(values[f.key] ?? "") as string}
            keyboardType={f.type === "number" || f.type === "currency" ? "numeric" : "default"}
            multiline={f.type === "textarea"}
            onChangeText={(t) => setValues((p) => ({ ...p, [f.key]: t }))}
          />
        </View>
      ))}
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <Button title={`Save to ${stage.label}`} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  label: { color: "#555", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  msg: { marginVertical: 8 },
});
