import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, readSession, saveSession } from "@/storage/session";
import type { StudentSession } from "@/types/api";

type AuthContextValue = {
  session: StudentSession | null;
  loading: boolean;
  signIn: (session: StudentSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readSession().then(setSession).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
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
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
