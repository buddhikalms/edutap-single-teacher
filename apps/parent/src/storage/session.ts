import * as SecureStore from "expo-secure-store";
import type { ParentSession } from "@/types/api";

const KEY = "edutap_parent_session";

export async function saveSession(session: ParentSession) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function readSession() {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? (JSON.parse(raw) as ParentSession) : null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEY);
}
