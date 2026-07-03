"use client";

import { useEffect } from "react";

export function PwaManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => registration.update()).catch(() => {
      // Registration is best-effort; the app must continue even when blocked by the browser.
    });
  }, []);

  return null;
}
