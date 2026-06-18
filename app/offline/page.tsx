import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4">
      <section className="w-full max-w-lg rounded-lg border bg-white p-8 text-center shadow-luxury">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-normal">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          EduTap is installed, but this page needs a connection. Reconnect and continue from the last screen.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to EduTap</Link>
        </Button>
      </section>
    </main>
  );
}
