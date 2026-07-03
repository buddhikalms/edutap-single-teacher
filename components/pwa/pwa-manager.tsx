"use client";

import { useEffect } from "react";

export function PwaManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      // A worker installed by a production preview remains active on localhost
      // unless it is explicitly removed, where it can serve stale Next.js chunks.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations
          .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
          .forEach((registration) => void registration.unregister());
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.filter((key) => key.startsWith("edutap-pwa-")).forEach((key) => void caches.delete(key));
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is best-effort; the app must continue even when blocked by the browser.
    });
  }, []);

  return null;
}
