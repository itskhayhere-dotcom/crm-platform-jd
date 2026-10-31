/**
 * Mobile app shell (Expo).
 *
 * Same Clerk application as the website → one account works on both. Signed out shows a
 * password sign-in; signed in shows the stage form, which uses the SAME crm.config and
 * apiClient as web (just rendered with React Native inputs). This is a minimal working
 * shell to prove the shared-login + shared-API flow end to end.
 */
import { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Button, ScrollView, StyleSheet } from "react-native";
import { ClerkProvider, SignedIn, SignedOut, useSignIn, useAuth } from "@clerk/clerk-expo";
import { StatusBar } from "expo-status-bar";
import crmConfig from "../../crm.config";
import { tokenCache } from "./src/tokenCache";
import { MobileStageForm } from "./src/MobileStageForm";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="auto" />
        <Text style={styles.title}>{crmConfig.product}</Text>
        <SignedOut><SignIn /></SignedOut>
        <SignedIn><Home /></SignedIn>
      </SafeAreaView>
    </ClerkProvider>
  );
}

function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!isLoaded) return;
    setError(null);
    try {
      const res = await signIn.create({ identifier: email, password });
      if (res.status === "complete") await setActive({ session: res.createdSessionId });
      else setError("Additional verification required — finish it in the web app once, then retry.");
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? "Could not sign in");
    }
  }

  return (
    <View style={styles.card}>
      <Text>Sign in (same account as the website)</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Sign in" onPress={submit} />
    </View>
  );
}

function Home() {
  const { signOut } = useAuth();
  // For brevity the mobile shell targets one client id; a full build adds a client list
  // screen that calls api.listClients() (same apiClient as web).
  const [clientId, setClientId] = useState("");
  const [stage, setStage] = useState(crmConfig.stages[0].key);

  return (
    <ScrollView contentContainerStyle={{ padding: 4 }}>
      <View style={styles.row}>
        <Text style={{ fontWeight: "600" }}>Signed in</Text>
        <Button title="Sign out" onPress={() => signOut()} />
      </View>

      <Text style={styles.label}>Client id</Text>
      <TextInput style={styles.input} placeholder="paste a client id" value={clientId} onChangeText={setClientId} />

      <Text style={styles.label}>Stage</Text>
      <View style={styles.row}>
        {crmConfig.stages.map((s) => (
          <Text key={s.key} onPress={() => setStage(s.key)}
            style={[styles.chip, stage === s.key && styles.chipOn]}>{s.label}</Text>
        ))}
      </View>

      {clientId ? <MobileStageForm stageKey={stage} clientId={clientId} /> : <Text>Enter a client id to begin.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: { gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" },
  label: { marginTop: 12, marginBottom: 4, color: "#555" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: "#111", color: "#fff", borderColor: "#111" },
  error: { color: "#c0392b" },
});
