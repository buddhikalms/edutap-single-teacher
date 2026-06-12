import * as SecureStore from "expo-secure-store";
import type { StudentSession } from "@/types/api";

const KEY = "classcard_student_session";

export async function saveSession(session: StudentSession) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function readSession() {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? (JSON.parse(raw) as StudentSession) : null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEY);
}
