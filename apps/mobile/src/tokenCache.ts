/**
 * Stores the Clerk session token securely on the device so the user stays signed in.
 * Used by ClerkProvider in App.tsx.
 */
import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try { await SecureStore.setItemAsync(key, value); } catch { /* ignore */ }
  },
};
