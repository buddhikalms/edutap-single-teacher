"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMobileCamera } from "@/hooks/useMobileCamera";
import { FaceGuideOverlay } from "@/components/face-attendance/FaceGuideOverlay";

const POLICY_VERSION = "2026-07-face-attendance-v1";
const sampleSteps = [
  "Look straight at the camera",
  "Turn slightly left",
  "Turn slightly right",
  "Look slightly upward",
  "Look slightly downward",
  "Blink naturally"
];

type ProfileResponse = {
  enabled: boolean;
  selfEnrollmentAllowed: boolean;
  profile: null | {
    exists: boolean;
    status: string;
    enrolledAt: string;
    lastVerifiedAt: string | null;
  };
  consent: null | {
    consented: boolean;
    policyVersion: string;
    consentedAt: string | null;
    revokedAt: string | null;
  };
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  const json = await response.json();
  if (!response.ok || !json.ok) throw new Error(json.message || "Request failed.");
  return json;
}

export function FaceEnrollmentWizard() {
  const { videoRef, status: cameraStatus, startCamera, stopCamera, captureFrame } = useMobileCamera();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [consent, setConsent] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const [message, setMessage] = useState("Review the consent details before turning on the camera.");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  const currentStep = sampleSteps[Math.min(frames.length, sampleSteps.length - 1)];
  const canEnroll = profile?.enabled && profile.selfEnrollmentAllowed;

  useEffect(() => {
    api<ProfileResponse>("/api/student/face/profile")
      .then(setProfile)
      .catch((error) => setMessage(error.message));
  }, []);

  async function begin() {
    if (!consent || !canEnroll) return;
    setBusy(true);
    try {
      await api("/api/student/face/enrolment/start", {
        method: "POST",
        body: JSON.stringify({
          consentAccepted: true,
          policyVersion: POLICY_VERSION,
          deviceInfo: navigator.userAgent
        })
      });
      await startCamera();
      setMessage(currentStep);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start enrolment.");
    } finally {
      setBusy(false);
    }
  }

  function captureSample() {
    const frame = captureFrame();
    if (!frame) {
      setMessage("Could not capture a clear camera frame. Hold the phone steady and try again.");
      return;
    }
    const next = [...frames, frame];
    setFrames(next);
    setMessage(next.length >= sampleSteps.length ? "All samples captured. Complete setup now." : sampleSteps[next.length]);
    navigator.vibrate?.(50);
  }

  async function completeEnrollment() {
    setBusy(true);
    try {
      await api("/api/student/face/enrolment/complete", {
        method: "POST",
        body: JSON.stringify({ frames })
      });
      setComplete(true);
      setMessage("Face profile is active. You can now use face attendance.");
      stopCamera();
      navigator.vibrate?.([80, 40, 80]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Face enrolment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile() {
    setBusy(true);
    try {
      await api("/api/student/face/profile", { method: "DELETE" });
      setProfile(null);
      setFrames([]);
      setComplete(false);
      setMessage("Face profile deletion request was recorded.");
      stopCamera();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Back to profile">
          <Link href="/student/profile"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <Badge variant={profile?.profile?.status === "ACTIVE" || complete ? "success" : "outline"}>
          {profile?.profile?.status ?? (complete ? "ACTIVE" : "Not enrolled")}
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Set Up Face ID</h1>
        <p className="text-sm text-muted-foreground">Register your face for secure class attendance.</p>
      </div>

      {!canEnroll ? (
        <Card><CardContent className="p-5 text-sm">Face self-enrolment is not enabled for this institute. Ask an administrator to enable it.</CardContent></Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-950">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Front camera preview" />
            <FaceGuideOverlay state={complete ? "good" : frames.length ? "warning" : "idle"} />
            <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
              {cameraStatus === "ready" ? "Camera ready" : "Front camera"}
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3" role="status" aria-live="polite">
            <div className="flex items-center gap-2 font-medium">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4" />}
              <span>{message}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{frames.length} of {sampleSteps.length} samples captured.</p>
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={!canEnroll || cameraStatus === "ready"} />
            <span>
              I consent to secure face attendance. My face template is used only to verify my attendance, encrypted at rest, and fallback attendance methods remain available.
            </span>
          </label>

          <div className="grid gap-2">
            {cameraStatus !== "ready" ? (
              <Button onClick={begin} disabled={!consent || !canEnroll || busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Start Camera
              </Button>
            ) : frames.length < sampleSteps.length ? (
              <Button onClick={captureSample} disabled={busy}>
                <Camera className="h-4 w-4" />
                Capture Sample
              </Button>
            ) : (
              <Button onClick={completeEnrollment} disabled={busy || complete}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Complete Face Setup
              </Button>
            )}
            {profile?.profile?.exists ? (
              <Button variant="outline" onClick={deleteProfile} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                Request Deletion
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
