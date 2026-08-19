"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Play, ScanFace, Square, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { startAttendanceSession } from "@/app/(dashboard)/attendance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useMobileCamera } from "@/hooks/useMobileCamera";
import { FaceGuideOverlay } from "@/components/face-attendance/FaceGuideOverlay";

type KioskClass = {
  id: string;
  name: string;
  branchName: string;
  faceProfileCount: number;
  activeSession: null | {
    id: string;
    startsAt: string | null;
    present: number;
    late: number;
    total: number;
  };
};

type RecognizeResult = {
  ok: boolean;
  result: "recognized" | "duplicate" | "unknown" | "ambiguous" | "failed" | "failed-liveness";
  message: string;
  student?: { id: string; name: string; admissionNo: string };
  status?: string;
  markedAt?: string;
  similarityScore?: number | null;
  livenessScore?: number | null;
};

const challengePool = [
  ["blink", "turn-left"],
  ["blink", "turn-right"],
  ["look-up", "blink"],
  ["turn-left", "turn-right"]
];

const labels: Record<string, string> = {
  blink: "Blink once",
  "turn-left": "Turn slightly left",
  "turn-right": "Turn slightly right",
  "look-up": "Look slightly upward"
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.message || "Request failed.");
  return payload;
}

export function StaffFaceKiosk({ classes }: { classes: KioskClass[] }) {
  const router = useRouter();
  const { videoRef, status: cameraStatus, devices, deviceId, errorMessage: cameraError, startCamera, stopCamera, captureFrame } = useMobileCamera();
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [health, setHealth] = useState("Checking face service...");
  const [challenge, setChallenge] = useState(challengePool[0]);
  const [message, setMessage] = useState("Start a session and camera, then scan one student at a time.");
  const [recent, setRecent] = useState<RecognizeResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [sessionPending, startSessionTransition] = useTransition();
  const cooldownRef = useRef(0);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? classes[0] ?? null,
    [classes, selectedClassId]
  );
  const activeSession = selectedClass?.activeSession ?? null;
  const canScan = Boolean(activeSession && cameraStatus === "ready" && !processing);

  useEffect(() => {
    json<{ model?: string; modelVersion?: string }>("/api/attendance/face/health")
      .then((result) => setHealth(`Model ${result.model || "ready"} ${result.modelVersion || ""}`.trim()))
      .catch((error) => setHealth(error instanceof Error ? error.message : "Face service unavailable."));
  }, []);

  function startSession() {
    if (!selectedClass) return;
    startSessionTransition(async () => {
      const result = await startAttendanceSession({
        classGroupId: selectedClass.id,
        sessionDate: new Date().toISOString().slice(0, 10),
        sessionType: "INHOUSE",
        notes: "Face kiosk session"
      });
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  async function openCamera() {
    await startCamera(selectedDeviceId || undefined);
  }

  function chooseChallenge() {
    return challengePool[Math.floor(Math.random() * challengePool.length)];
  }

  async function runScan() {
    if (!activeSession) {
      toast.error("Start an attendance session first.");
      return;
    }
    if (Date.now() < cooldownRef.current) {
      toast.info("Ready again in a moment.");
      return;
    }

    const nextChallenge = chooseChallenge();
    setChallenge(nextChallenge);
    setProcessing(true);
    setMessage(nextChallenge.map((item) => labels[item]).join(", "));

    try {
      const frames: string[] = [];
      for (let index = 0; index < 4; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, index === 0 ? 150 : 650));
        const frame = captureFrame(0.82);
        if (!frame) throw new Error("Camera frame was not ready.");
        frames.push(frame);
      }

      const result = await json<RecognizeResult>("/api/attendance/face/recognize", {
        method: "POST",
        body: JSON.stringify({
          attendanceSessionId: activeSession.id,
          frames,
          challengeActions: nextChallenge,
          deviceId: deviceId || selectedDeviceId || "dashboard-face-kiosk",
          deviceLabel: devices.find((item) => item.deviceId === selectedDeviceId)?.label
        })
      });

      setRecent((current) => [result, ...current].slice(0, 8));
      setMessage(result.message);
      if (result.ok && result.result === "recognized") {
        cooldownRef.current = Date.now() + Number(process.env.NEXT_PUBLIC_FACE_SCAN_COOLDOWN_MS ?? "3500");
        toast.success(`${result.student?.name ?? "Student"} marked ${result.status?.toLowerCase()}.`);
        beep();
        router.refresh();
      } else if (result.ok && result.result === "duplicate") {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Face scan failed.";
      setMessage(text);
      toast.error(text);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Supervised kiosk</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Face Attendance Kiosk</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Use a USB or built-in camera to recognize one enrolled student at a time for the selected class session.
            </p>
          </div>
          <Badge variant={health.toLowerCase().includes("unavailable") || health.toLowerCase().includes("failed") ? "warning" : "success"}>{health}</Badge>
          <Button asChild variant="outline">
            <Link href="/attendance/face/test">Open Test Page</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Kiosk Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Class</span>
              <Select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.branchName}
                  </option>
                ))}
              </Select>
            </label>
            <div className="rounded-xl border bg-white/70 p-4 text-sm">
              <p className="font-semibold">{selectedClass?.name ?? "No class selected"}</p>
              <p className="mt-1 text-muted-foreground">{selectedClass?.faceProfileCount ?? 0} enrolled face profiles</p>
              <p className="mt-1 text-muted-foreground">
                {activeSession ? `${activeSession.present + activeSession.late}/${activeSession.total} marked` : "No active session"}
              </p>
            </div>
            {!activeSession ? (
              <Button className="w-full" onClick={startSession} disabled={sessionPending || !selectedClass}>
                {sessionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start Today Session
              </Button>
            ) : null}
            <label className="space-y-2">
              <span className="text-sm font-semibold">Camera</span>
              <Select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
                <option value="">Default/front camera</option>
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={openCamera}>
                <Camera className="h-4 w-4" />
                {cameraStatus === "ready" ? "Camera On" : "Enable Camera"}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
            <Button className="w-full" size="lg" onClick={runScan} disabled={!canScan}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
              Scan Student
            </Button>
            {cameraError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950" role="alert">
                {cameraError}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Camera Preview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <FaceGuideOverlay state={processing ? "warning" : recent[0]?.ok ? "good" : "idle"} />
              <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                {cameraStatus === "ready" ? "Camera ready" : cameraStatus === "permission-denied" ? "Permission required" : "Camera stopped"}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border bg-white/70 p-4">
                <p className="text-sm font-semibold">Challenge</p>
                <p className="mt-2 text-lg font-semibold">{challenge.map((item) => labels[item]).join(", ")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
              </div>
              <Button variant="outline" onClick={beep}>
                <Volume2 className="h-4 w-4" />
                Test Sound
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Recent Face Results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">No face scans yet.</p> : null}
          {recent.map((item, index) => (
            <div key={`${item.markedAt ?? item.message}-${index}`} className="rounded-xl border bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.student?.name ?? item.result}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                </div>
                <Badge variant={item.ok ? "success" : "warning"}>{item.result}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Match {item.similarityScore?.toFixed(3) ?? "-"} - Live {item.livenessScore?.toFixed(3) ?? "-"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function beep() {
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  window.setTimeout(() => {
    oscillator.stop();
    void context.close();
  }, 120);
}
