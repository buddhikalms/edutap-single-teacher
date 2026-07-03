"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

export function PaymentSlipUpload({
  name = "paymentSlip",
  required,
  disabled,
  maxMb = Number(process.env.NEXT_PUBLIC_PAYMENT_SLIP_MAX_MB || 5)
}: {
  name?: string;
  required?: boolean;
  disabled?: boolean;
  maxMb?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function choose(next: File | null) {
    setError("");
    const nextPreview = next?.type.startsWith("image/") ? URL.createObjectURL(next) : "";
    if (next && next.size > maxMb * 1024 * 1024) {
      if (nextPreview) URL.revokeObjectURL(nextPreview);
      setFile(null);
      setPreviewUrl("");
      if (inputRef.current) inputRef.current.value = "";
      setError(`Choose a file no larger than ${maxMb} MB.`);
      return;
    }
    setFile(next);
    setPreviewUrl(nextPreview);
  }

  function clear() {
    choose(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return <div className="space-y-2">
    <input
      ref={inputRef}
      className="sr-only"
      type="file"
      name={name}
      accept={ACCEPT}
      required={required}
      disabled={disabled}
      onChange={(event) => choose(event.target.files?.[0] ?? null)}
    />
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "group relative flex min-h-44 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-5 text-center transition",
        dragging ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50 hover:border-primary/60 hover:bg-primary/[0.03]",
        disabled && "cursor-not-allowed opacity-60"
      )}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        choose(event.dataTransfer.files?.[0] ?? null);
        if (inputRef.current && event.dataTransfer.files?.length) inputRef.current.files = event.dataTransfer.files;
      }}
    >
      {previewUrl ? <>
        {/* Blob previews are local-only and cannot use the Next image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Payment slip preview" className="absolute inset-0 h-full w-full object-contain bg-white" />
      </> : file ? <>
        <FileText className="h-10 w-10 text-primary" />
        <span className="mt-3 max-w-full truncate font-semibold">{file.name}</span>
        <span className="mt-1 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</span>
      </> : <>
        <span className="rounded-2xl bg-white p-3 shadow-sm"><UploadCloud className="h-7 w-7 text-primary" /></span>
        <span className="mt-3 font-semibold">Drop your payment slip here</span>
        <span className="mt-1 text-sm text-muted-foreground">or tap to browse · JPG, PNG, WebP, PDF · max {maxMb} MB</span>
      </>}
    </button>
    {file ? <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 text-sm">
      <span className="min-w-0 truncate">{file.name}</span>
      <button type="button" className="rounded-full p-1 text-muted-foreground hover:bg-muted" onClick={clear} aria-label="Remove payment slip"><X className="h-4 w-4" /></button>
    </div> : null}
    {error ? <p className="text-sm text-destructive">{error}</p> : null}
  </div>;
}
