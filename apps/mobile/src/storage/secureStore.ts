import * as SecureStore from "expo-secure-store";
import { defaultApiUrl } from "@/config/env";
import type { ApiUser } from "@/types/api";

const TOKEN_KEY = "edutap.mobile.token";
const USER_KEY = "edutap.mobile.user";
const API_URL_KEY = "edutap.mobile.apiUrl";

export async function saveSession(token: string, user: ApiUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function readSession() {
  const [token, userJson, apiUrl] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(API_URL_KEY)
  ]);

  return {
    token,
    user: userJson ? (JSON.parse(userJson) as ApiUser) : null,
    apiUrl: apiUrl ?? defaultApiUrl
  };
}

export async function clearSession() {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}

export async function saveApiUrl(apiUrl: string) {
  await SecureStore.setItemAsync(API_URL_KEY, apiUrl);
}
