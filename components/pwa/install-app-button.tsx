"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIos && isSafari;
}

export function InstallAppButton({ variant = "banner" }: { variant?: "banner" | "button" }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ios = useMemo(() => isIosSafari(), []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowIosGuide(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installed) return;

    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setInstalled(true);
      }
      setPromptEvent(null);
      return;
    }

    if (ios) {
      setShowIosGuide(true);
    }
  }

  if (installed || dismissed || (!promptEvent && !ios)) {
    return null;
  }

  if (variant === "button") {
    return (
      <>
        <Button type="button" onClick={install}>
          <Download className="h-4 w-4" />
          Install EduTap App
        </Button>
        {showIosGuide ? <IosGuide onClose={() => setShowIosGuide(false)} /> : null}
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-white/92 p-4 shadow-luxury">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">Install EduTap App</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Use EduTap from your home screen with offline fallback and app-style navigation.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setDismissed(true)} aria-label="Dismiss install app banner">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" className="mt-4 w-full sm:w-auto" onClick={install}>
          {ios ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {ios ? "Show iPhone install guide" : "Install EduTap App"}
        </Button>
      </div>
      {showIosGuide ? <IosGuide onClose={() => setShowIosGuide(false)} /> : null}
    </>
  );
}

function IosGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-luxury">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">Install on iPhone or iPad</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Tap Share, then choose Add to Home Screen.</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Close install guide">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5 rounded-lg bg-muted p-4 text-sm">
          <p className="font-semibold">Safari steps</p>
          <p className="mt-2 text-muted-foreground">1. Tap the Share button in Safari.</p>
          <p className="mt-1 text-muted-foreground">2. Select Add to Home Screen.</p>
          <p className="mt-1 text-muted-foreground">3. Tap Add to install EduTap.</p>
        </div>
      </div>
    </div>
  );
}
