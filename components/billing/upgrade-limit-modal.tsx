import Link from "next/link";
import { ArrowUpRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpgradeLimitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-luxury">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Crown className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">Package limit reached</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">You have reached your package limit. Upgrade to continue.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <Link href="/billing">
              Upgrade
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
