import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest } from "@/api/auth";
import { clearSession, readSession, saveApiUrl, saveSession } from "@/storage/secureStore";
import type { ApiUser } from "@/types/api";

type AuthContextValue = {
  token: string | null;
  user: ApiUser | null;
  apiUrl: string;
  loading: boolean;
  signIn: (input: { email: string; password: string; apiUrl: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readSession()
      .then((session) => {
        setToken(session.token);
        setUser(session.user);
        setApiUrl(session.apiUrl);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      apiUrl,
      loading,
      async signIn(input) {
        const response = await loginRequest(input);
        await saveApiUrl(input.apiUrl);
        await saveSession(response.token, response.user);
        setToken(response.token);
        setUser(response.user);
        setApiUrl(input.apiUrl);
      },
      async signOut() {
        await clearSession();
        setToken(null);
        setUser(null);
      }
    }),
    [apiUrl, loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
