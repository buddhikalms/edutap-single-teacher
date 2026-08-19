"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Loader2, RefreshCcw, ShieldCheck, SwitchCamera, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useMobileCamera } from "@/hooks/useMobileCamera";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { FaceGuideOverlay } from "@/components/face-attendance/FaceGuideOverlay";
import { ConnectionStatus } from "@/components/face-attendance/ConnectionStatus";
import { FallbackAttendanceOptions } from "@/components/face-attendance/FallbackAttendanceOptions";

type ActiveSession = {
  id: string;
  className: string;
  subject: string;
  teacherName: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  alreadyMarked: boolean;
};

const actionLabels: Record<string, string> = {
  blink: "Blink now",
  turn_left: "Turn your head left",
  turn_right: "Turn your head right",
  look_up: "Look slightly upward",
  look_down: "Look slightly downward",
  move_closer: "Move slightly closer"
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

export function MobileFaceAttendance() {
  const online = useNetworkStatus();
  const { videoRef, status: cameraStatus, devices, errorMessage: cameraError, startCamera, stopCamera, captureFrame } = useMobileCamera();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [message, setMessage] = useState("Choose an active class session to begin.");
  const [phase, setPhase] = useState<"idle" | "loading" | "camera" | "challenge" | "processing" | "success" | "failed">("idle");
  const [attempts, setAttempts] = useState(0);
  const [challenge, setChallenge] = useState<string[]>([]);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const selectedSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId), [sessions, selectedSessionId]);
  const guideState = phase === "success" ? "good" : phase === "failed" ? "error" : phase === "processing" ? "processing" : "warning";

  useEffect(() => {
    api<{ sessions: ActiveSession[] }>("/api/student/attendance/active-sessions")
      .then((data) => {
        setSessions(data.sessions);
        setSelectedSessionId(data.sessions[0]?.id ?? "");
        if (!data.sessions.length) setMessage("No active attendance sessions are available right now.");
      })
      .catch((error) => setMessage(error.message));
  }, []);

  async function begin() {
    if (!selectedSessionId || !online) return;
    setPhase("loading");
    setMessage("Checking attendance session and camera permission.");
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      setPhase("failed");
      setMessage("Camera permission is required before face attendance can start.");
      return;
    }
    const data = await api<{ attemptId: string; challengeActions: string[] }>("/api/student/face/verification/start", {
      method: "POST",
      body: JSON.stringify({ attendanceSessionId: selectedSessionId, deviceId: navigator.userAgent.slice(0, 120) })
    });
    setAttemptId(data.attemptId);
    setChallenge(data.challengeActions);
    setChallengeIndex(0);
    setAttempts((value) => value + 1);
    setPhase("challenge");
    setMessage(actionLabels[data.challengeActions[0]] ?? "Look straight at the camera.");
    navigator.vibrate?.(80);
  }

  async function nextChallenge() {
    if (challengeIndex + 1 < challenge.length) {
      const next = challengeIndex + 1;
      setChallengeIndex(next);
      setMessage(actionLabels[challenge[next]] ?? "Hold still.");
      navigator.vibrate?.(60);
      return;
    }
    await verify();
  }

  async function verify() {
    if (!attemptId) return;
    setPhase("processing");
    setMessage("Processing liveness and face match securely.");
    const frames = Array.from({ length: 5 }, () => captureFrame()).filter(Boolean);
    if (frames.length < 3) {
      setPhase("failed");
      setMessage("Camera frame capture failed. Please retry.");
      stopCamera();
      return;
    }
    try {
      const verification = await api<{ verificationToken: string }>("/api/student/face/verification/complete", {
        method: "POST",
        body: JSON.stringify({
          attendanceSessionId: selectedSessionId,
          attemptId,
          challengeActions: challenge,
          frames,
          deviceId: navigator.userAgent.slice(0, 120)
        })
      });
      const marked = await api<{ status: string; markedAt: string; className: string }>("/api/student/attendance/face/mark", {
        method: "POST",
        body: JSON.stringify({ verificationToken: verification.verificationToken, deviceId: navigator.userAgent.slice(0, 120) })
      });
      setPhase("success");
      setMessage(`${marked.status.toLowerCase()} attendance confirmed for ${marked.className}.`);
      stopCamera();
      navigator.vibrate?.([80, 40, 80]);
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "Face attendance failed.");
      stopCamera();
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Back to attendance">
          <Link href="/student/attendance"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <Badge variant={selectedSession?.status === "ACTIVE" ? "success" : "outline"}>{selectedSession?.status ?? "No session"}</Badge>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Face Attendance</h1>
        <p className="text-sm text-muted-foreground">{selectedSession ? `${selectedSession.className} • ${selectedSession.teacherName}` : "Secure mobile verification"}</p>
      </div>

      <ConnectionStatus online={online} />

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
          <Select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} aria-label="Active attendance session">
            <option value="" disabled>Select active session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.className}</option>
            ))}
          </Select>

          <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-950">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Front camera preview" />
            <FaceGuideOverlay state={guideState} />
            <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white">
              {cameraStatus === "ready" ? "Camera ready" : cameraStatus === "permission-denied" ? "Permission required" : cameraStatus === "unavailable" ? "Camera unavailable" : "Front camera"}
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3" role="status" aria-live="polite">
            <div className="flex items-center gap-2 font-medium">
              {phase === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : phase === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : phase === "failed" ? <XCircle className="h-4 w-4 text-red-600" /> : <ShieldCheck className="h-4 w-4" />}
              <span>{message}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Attempt {attempts} of 3. No face images are stored in this browser.</p>
          </div>
          {cameraError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950" role="alert">
              {cameraError}
            </div>
          ) : null}

          <div className="flex gap-2">
            {phase === "challenge" ? (
              <Button className="flex-1" onClick={nextChallenge}><CheckCircle2 className="mr-2 h-4 w-4" />Done</Button>
            ) : (
              <Button className="flex-1" disabled={!selectedSessionId || !online || phase === "processing"} onClick={begin}>
                {phase === "failed" ? <RefreshCcw className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                {cameraStatus === "ready" ? "Start Scan" : phase === "failed" ? "Retry Camera" : "Enable Camera Permission"}
              </Button>
            )}
            {devices.length > 1 && (
              <Button variant="outline" size="icon" aria-label="Switch camera" onClick={() => startCamera(devices.find((device) => device.deviceId !== devices[0]?.deviceId)?.deviceId)}>
                <SwitchCamera className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border p-3 text-xs text-muted-foreground">
        Face attendance verifies liveness and your registered profile for this session only. Use a fallback method if camera access, lighting, or accessibility needs make face recognition difficult.
      </div>
      <FallbackAttendanceOptions />
    </div>
  );
}
