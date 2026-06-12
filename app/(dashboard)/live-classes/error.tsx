"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LiveClassesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardContent className="p-8">
          <div className="flex max-w-2xl flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-normal">Live class action could not be completed</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{error.message || "Please check the provider settings and try again."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href="/live-classes/settings">Provider settings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/live-classes">Back to live classes</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
