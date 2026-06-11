"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Something needs attention</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The workspace could not finish loading. Try again, or check your database connection and environment values.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </main>
  );
}
