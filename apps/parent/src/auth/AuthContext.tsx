import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Notifications from "expo-notifications";
import { registerDeviceToken } from "@/api/parent";
import { clearSession, readSession, saveSession } from "@/storage/session";
import type { ParentSession } from "@/types/api";

type AuthContextValue = {
  session: ParentSession | null;
  loading: boolean;
  signIn: (session: ParentSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function requestPushToken() {
  const existing = await Notifications.getPermissionsAsync();
  const existingStatus = (existing as { status?: string; granted?: boolean }).status;
  const permission = existingStatus === "granted" || (existing as { granted?: boolean }).granted ? existing : await Notifications.requestPermissionsAsync();
  const permissionState = permission as { status?: string; granted?: boolean };

  if (permissionState.status !== "granted" && !permissionState.granted) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ParentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionToken = session?.token;

  useEffect(() => {
    readSession().then(setSession).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    requestPushToken()
      .then((token) => (token ? registerDeviceToken(token) : null))
      .catch(() => undefined);
  }, [sessionToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(nextSession) {
        await saveSession(nextSession);
        setSession(nextSession);
      },
      async signOut() {
        await clearSession();
        setSession(null);
      }
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
