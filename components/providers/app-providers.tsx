"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { PwaManager } from "@/components/pwa/pwa-manager";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaManager />
      {children}
      <Toaster richColors closeButton position="top-right" />
    </SessionProvider>
  );
}
