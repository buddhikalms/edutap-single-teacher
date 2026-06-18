"use client";

import { useEffect } from "react";

export function PwaManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV === "development") {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is best-effort; the app must continue even when blocked by the browser.
    });
  }, []);

  return null;
}
