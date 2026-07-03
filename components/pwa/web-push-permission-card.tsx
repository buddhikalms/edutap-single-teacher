"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }
  return output;
}

type WebPushPermissionCardProps = {
  audience?: "parent" | "student";
};

export function WebPushPermissionCard({ audience = "parent" }: WebPushPermissionCardProps) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const browserSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(publicKey);

  async function saveSubscription(subscription: PushSubscription) {
    const response = await fetch("/api/web-push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        platform: navigator.platform || "web",
        userAgent: navigator.userAgent
      })
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.message ?? "Could not save this browser subscription.");
    }
  }

  useEffect(() => {
    let active = true;

    async function checkSubscription() {
      if (!browserSupported) {
        if (active) setChecking(false);
        return;
      }

      try {
        setPermission(Notification.permission);
        const registration =
          (await navigator.serviceWorker.getRegistration()) ??
          (Notification.permission === "granted" ? await navigator.serviceWorker.register("/sw.js") : null);
        const subscription = await registration?.pushManager.getSubscription();
        if (active) setEnabled(Boolean(subscription));
      } catch {
        if (active) setEnabled(false);
      } finally {
        if (active) setChecking(false);
      }
    }

    checkSubscription();

    return () => {
      active = false;
    };
  }, [browserSupported]);
  async function enableNotifications() {
    if (!browserSupported || !publicKey) {
      toast.error("Web push is not available in this browser or VAPID key is missing.");
      return;
    }

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error("Notifications were not enabled.");
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));

      await saveSubscription(subscription);

      setEnabled(true);
      toast.success("Web alerts enabled", {
        description:
          audience === "student"
            ? "EduTap can now send class, homework, and quiz alerts to this browser."
            : "EduTap can now send class and payment alerts to this browser."
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable web notifications.");
    } finally {
      setLoading(false);
    }
  }

  if (!browserSupported || checking || enabled) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-white p-5 shadow-luxury">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{audience === "student" ? "Enable mobile alerts" : "Enable class alerts"}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {audience === "student"
              ? "Receive class, homework, quiz, and payment alerts on this mobile browser."
              : "Receive class and attendance alerts for your linked children on this browser."}
          </p>
          <Button type="button" className="mt-4" onClick={enableNotifications} disabled={loading || permission === "denied"}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {permission === "denied"
              ? "Notifications blocked"
              : permission === "granted"
                ? audience === "student"
                  ? "Connect mobile alerts"
                  : "Connect class alerts"
                : audience === "student"
                  ? "Enable mobile alerts"
                  : "Enable class alerts"}
          </Button>
        </div>
      </div>
    </div>
  );
}
