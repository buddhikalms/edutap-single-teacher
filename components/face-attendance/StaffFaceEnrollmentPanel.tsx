"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMobileCamera } from "@/hooks/useMobileCamera";
import { FaceGuideOverlay } from "@/components/face-attendance/FaceGuideOverlay";

const POLICY_VERSION = "2026-08-staff-face-attendance-v1";
const sampleSteps = ["Straight", "Slight left", "Slight right", "Look up", "Look down", "Blink"];

type Props = {
  studentId: string;
  studentName: string;
  hasProfile: boolean;
  enabled: boolean;
};

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) }
  });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(json.message || "Request failed.");
  return json;
}

export function StaffFaceEnrollmentPanel({ studentId, studentName, hasProfile, enabled }: Props) {
  const { videoRef, status, devices, errorMessage: cameraError, startCamera, stopCamera, captureFrame } = useMobileCamera();
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [frames, setFrames] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Get consent, select a camera, then capture six guided samples.");
  const [profileExists, setProfileExists] = useState(hasProfile);

  async function openCamera() {
    await startCamera(selectedDeviceId || undefined);
  }

  function capture() {
    const frame = captureFrame();
    if (!frame) {
      setMessage("Camera frame was not ready. Try again.");
      return;
    }
    const next = [...frames, frame].slice(0, sampleSteps.length);
    setFrames(next);
    setMessage(next.length === sampleSteps.length ? "Samples ready. Complete enrollment." : `Capture: ${sampleSteps[next.length]}`);
  }

  async function submit() {
    if (!consent) {
      toast.error("Record consent before enrollment.");
      return;
    }
    if (frames.length !== sampleSteps.length) {
      toast.error("Capture exactly six samples.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestJson<{ message: string; qualityScore?: number }>(`/api/staff/students/${studentId}/face`, {
        method: "POST",
        body: JSON.stringify({
          frames,
          policyVersion: POLICY_VERSION,
          deviceInfo: navigator.userAgent
        })
      });
      setProfileExists(true);
      setFrames([]);
      setMessage(`Enrolled. Quality ${result.qualityScore?.toFixed(2) ?? "accepted"}.`);
      toast.success(result.message);
      stopCamera();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Face enrollment failed.";
      setMessage(text);
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile() {
    setBusy(true);
    try {
      const result = await requestJson<{ message: string }>(`/api/staff/students/${studentId}/face`, { method: "DELETE" });
      setProfileExists(false);
      setFrames([]);
      setMessage(result.message);
      toast.success(result.message);
      stopCamera();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete face profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Supervised camera enrollment</p>
          <p className="text-sm text-muted-foreground">{studentName}</p>
        </div>
        <Badge variant={profileExists ? "success" : "outline"}>{profileExists ? "profile stored" : "not enrolled"}</Badge>
      </div>

      {!enabled ? <p className="rounded-lg border bg-amber-50 p-3 text-sm font-medium text-amber-950">Enable face attendance before enrollment.</p> : null}

      <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-950">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <FaceGuideOverlay state={frames.length === sampleSteps.length ? "good" : frames.length ? "warning" : "idle"} />
        <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {status === "ready" ? "Camera ready" : status === "permission-denied" ? "Permission needed" : "Camera stopped"}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={selectedDeviceId}
          onChange={(event) => setSelectedDeviceId(event.target.value)}
        >
          <option value="">Default/front camera</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={openCamera} disabled={!enabled || busy}>
          <Camera className="h-4 w-4" />
          {status === "ready" ? "Camera On" : "Enable Camera Permission"}
        </Button>
      </div>
      {cameraError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950" role="alert">
          {cameraError}
        </div>
      ) : null}

      <div className="rounded-lg border bg-white/70 p-3" role="status" aria-live="polite">
        <p className="text-sm font-medium">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{frames.length} of {sampleSteps.length} samples captured.</p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
        <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={!enabled || busy} />
        <span>I confirm the student/guardian authorized biometric enrollment for attendance only.</span>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" onClick={capture} disabled={!enabled || busy || status !== "ready" || frames.length >= sampleSteps.length}>
          <Camera className="h-4 w-4" />
          Capture {sampleSteps[Math.min(frames.length, sampleSteps.length - 1)]}
        </Button>
        <Button type="button" onClick={submit} disabled={!enabled || busy || !consent || frames.length !== sampleSteps.length}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Complete Enrollment
        </Button>
        <Button type="button" variant="outline" onClick={() => setFrames([])} disabled={busy || frames.length === 0}>
          <RotateCcw className="h-4 w-4" />
          Retake Samples
        </Button>
        <Button type="button" variant="destructive" onClick={deleteProfile} disabled={busy || !profileExists}>
          <Trash2 className="h-4 w-4" />
          Delete Biometric Profile
        </Button>
      </div>
    </div>
  );
}
