"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RefreshCw, ScanFace, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { FaceGuideOverlay } from "@/components/face-attendance/FaceGuideOverlay";
import { useMobileCamera } from "@/hooks/useMobileCamera";

type Health = { ok: boolean; model?: string; modelVersion?: string; message?: string };
type TestResult = {
  ok: boolean;
  faceDetected?: boolean;
  singleFace?: boolean;
  qualityScore?: number | null;
  model?: string | null;
  modelVersion?: string | null;
  reasonCode?: string | null;
  message?: string;
  embeddingGenerated?: boolean;
};

type NativeFace = { boundingBox: DOMRectReadOnly };
type NativeFaceDetector = {
  detect(source: HTMLVideoElement): Promise<NativeFace[]>;
};
type NativeFaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => NativeFaceDetector;

declare global {
  interface Window {
    FaceDetector?: NativeFaceDetectorConstructor;
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || "Request failed.");
  return json;
}

export function FaceAttendanceTestPanel() {
  const { videoRef, status, devices, errorMessage, startCamera, stopCamera, captureFrame } = useMobileCamera();
  const [deviceId, setDeviceId] = useState("");
  const [frames, setFrames] = useState<string[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const detectorRef = useRef<NativeFaceDetector | null>(null);
  const lastAutoCaptureRef = useRef(0);

  async function loadHealth() {
    try {
      setHealth(await api<Health>("/api/attendance/face/health"));
    } catch (error) {
      setHealth({ ok: false, message: error instanceof Error ? error.message : "Face service unavailable." });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHealth();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function capture() {
    const frame = captureFrame(0.82);
    if (!frame) {
      toast.error("Camera frame is not ready.");
      return;
    }
    setFrames((current) => [...current, frame].slice(0, 10));
  }

  useEffect(() => {
    if (!autoDetect || status !== "ready" || frames.length >= 5) return;
    let cancelled = false;

    async function tick() {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || cancelled) return;

      let readyToCapture = true;
      if (window.FaceDetector) {
        detectorRef.current ??= new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        try {
          const faces = await detectorRef.current.detect(video);
          const face = faces[0]?.boundingBox;
          const guideLeft = video.videoWidth * 0.17;
          const guideRight = video.videoWidth * 0.83;
          const guideTop = video.videoHeight * 0.08;
          const guideBottom = video.videoHeight * 0.92;
          readyToCapture = Boolean(
            face &&
              faces.length === 1 &&
              face.width >= video.videoWidth * 0.16 &&
              face.height >= video.videoHeight * 0.2 &&
              face.x + face.width / 2 >= guideLeft &&
              face.x + face.width / 2 <= guideRight &&
              face.y + face.height / 2 >= guideTop &&
              face.y + face.height / 2 <= guideBottom
          );
          setFaceDetected(readyToCapture);
        } catch {
          readyToCapture = true;
          setFaceDetected(null);
        }
      } else {
        setFaceDetected(null);
      }

      const now = Date.now();
      if (readyToCapture && now - lastAutoCaptureRef.current > 900) {
        const frame = captureFrame(0.82);
        if (frame) {
          lastAutoCaptureRef.current = now;
          setFrames((current) => (current.length >= 5 ? current : [...current, frame].slice(0, 5)));
        }
      }
    }

    const timer = window.setInterval(() => void tick(), 450);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [autoDetect, captureFrame, frames.length, status, videoRef]);

  async function run(mode: "quality" | "embedding") {
    if (frames.length < (mode === "embedding" ? 5 : 1)) {
      toast.error(mode === "embedding" ? "Capture at least 5 frames first." : "Capture a frame first.");
      return;
    }
    setBusy(true);
    try {
      const payload = await api<TestResult>("/api/attendance/face/test-quality", {
        method: "POST",
        body: JSON.stringify({ frames, mode })
      });
      setResult(payload);
      if (payload.ok) toast.success(payload.message ?? "Face test passed.");
      else toast.error(payload.message ?? payload.reasonCode ?? "Face test failed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Face test failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Diagnostics</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Face Attendance Test</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Test camera access and the private face service without enrolling students or marking attendance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={health?.ok ? "success" : "warning"}>{health?.ok ? "service ready" : health?.message ?? "checking"}</Badge>
            <Button variant="outline" onClick={loadHealth}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Camera Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-950">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <FaceGuideOverlay state={result?.ok ? "good" : frames.length ? "warning" : "idle"} />
              <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                {status === "ready" ? "Camera ready" : status === "permission-denied" ? "Permission required" : "Camera stopped"}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <Select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
                <option value="">Default/front camera</option>
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </Select>
              <Button variant={status === "ready" ? "outline" : "default"} onClick={() => startCamera(deviceId || undefined)}>
                <Camera className="h-4 w-4" />
                {status === "ready" ? "Camera On" : status === "checking" ? "Opening..." : "Enable Camera Permission"}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
              <Button onClick={capture} disabled={status !== "ready" || frames.length >= 10}>
                <ScanFace className="h-4 w-4" />
                Capture
              </Button>
            </div>
            {errorMessage ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950" role="alert">
                {errorMessage}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/70 px-4 py-3 text-sm">
              <span className="font-medium">
                {autoDetect
                  ? faceDetected === true
                    ? "Face detected. Capturing samples automatically."
                    : faceDetected === false
                      ? "Looking for one face inside the guide."
                      : "Auto capture is running."
                  : "Auto capture is off."}
              </span>
              <Button variant="outline" size="sm" onClick={() => setAutoDetect((value) => !value)}>
                {autoDetect ? "Auto on" : "Auto off"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-white/70 p-4">
              <p className="text-sm font-semibold">Frames captured</p>
              <p className="mt-2 text-3xl font-semibold">{frames.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Embedding test requires at least 5 frames.</p>
            </div>
            <div className="grid gap-2">
              <Button onClick={() => run("quality")} disabled={busy || frames.length < 1}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Test Quality
              </Button>
              <Button variant="outline" onClick={() => run("embedding")} disabled={busy || frames.length < 5}>
                <ScanFace className="h-4 w-4" />
                Test Embedding Pipeline
              </Button>
              <Button variant="outline" onClick={() => { setFrames([]); setResult(null); }}>
                <Trash2 className="h-4 w-4" />
                Clear Frames
              </Button>
            </div>
            {result ? (
              <div className="space-y-2 rounded-xl border bg-white/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{result.message ?? result.reasonCode}</span>
                  <Badge variant={result.ok ? "success" : "warning"}>{result.ok ? "passed" : "failed"}</Badge>
                </div>
                <p className="text-muted-foreground">Reason: {result.reasonCode ?? "-"}</p>
                <p className="text-muted-foreground">Quality: {result.qualityScore?.toFixed(3) ?? "-"}</p>
                <p className="text-muted-foreground">Model: {result.model ?? health?.model ?? "-"}</p>
                <p className="text-muted-foreground">Version: {result.modelVersion ?? health?.modelVersion ?? "-"}</p>
                <p className="text-muted-foreground">Embedding generated: {result.embeddingGenerated ? "yes" : "no"}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
