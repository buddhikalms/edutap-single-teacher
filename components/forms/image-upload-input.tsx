"use client";

import { useId, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ImageUploadInputProps = {
  name?: string;
  defaultValue?: string | null;
  onUploaded?: (url: string) => void;
  required?: boolean;
};

export function ImageUploadInput({ name, defaultValue, onUploaded, required }: ImageUploadInputProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function updateValue(url: string) {
    setValue(url);
    onUploaded?.(url);
  }

  async function upload(file: File | undefined) {
    if (!file) return;

    setUploading(true);
    setError("");
    const body = new FormData();
    body.set("file", file);

    try {
      const response = await fetch("/api/uploads/images", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!response.ok || !payload?.url) {
        setError(payload?.message ?? "The image could not be uploaded.");
        return;
      }

      updateValue(payload.url);
    } catch {
      setError("The image could not be uploaded. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="Uploaded preview" className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : value ? "Replace image" : "Choose image"}
          </label>
          <Input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP, or GIF. Maximum 5 MB.</p>
        </div>
        {value ? (
          <Button type="button" variant="outline" size="icon" onClick={() => updateValue("")} disabled={uploading} aria-label="Remove image">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
