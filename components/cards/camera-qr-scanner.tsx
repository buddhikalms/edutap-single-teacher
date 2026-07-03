"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrCodeScanner({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let controls: IScannerControls | undefined;
    let stopped = false;
    handledRef.current = false;
    new BrowserQRCodeReader().decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } } }, videoRef.current!,
      (result) => {
        if (!result || handledRef.current || stopped) return;
        handledRef.current = true;
        controls?.stop();
        onScan(result.getText());
      }
    ).then((value) => { controls = value; }).catch((reason) => {
      if (!stopped) setError(reason instanceof Error ? reason.message : "Could not open the camera.");
    });
    return () => { stopped = true; controls?.stop(); };
  }, [open, onScan]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-primary/55 p-3 backdrop-blur-sm sm:p-4">
      <button className="absolute inset-0" aria-label="Close QR scanner" onClick={onClose} />
      <div className="relative my-auto w-full max-w-lg rounded-2xl border bg-background p-4 shadow-luxury sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><p className="font-semibold">Scan student QR code</p><p className="text-sm text-muted-foreground">Allow camera access, then point the phone at the code.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}><X className="h-4 w-4" />Close</Button>
        </div>
        <video ref={videoRef} className="max-h-[68vh] min-h-72 w-full rounded-xl bg-black object-cover sm:aspect-square" muted playsInline />
        {error ? <p className="mt-3 text-sm text-destructive">{error} Camera scanning requires permission and a secure HTTPS page on most phones.</p> : null}
      </div>
    </div>
  );
}
