"use client";

export function ConnectionStatus({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-500/60 dark:bg-amber-950 dark:text-amber-100">
      Connection lost. Keep the camera open and retry when you are back online.
    </div>
  );
}
