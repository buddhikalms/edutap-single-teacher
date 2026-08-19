"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useMobileCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "permission-denied" | "unavailable">("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (nextDeviceId?: string) => {
    setErrorMessage(null);
    const host = window.location.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!window.isSecureContext && !isLocalHost) {
      setStatus("unavailable");
      setErrorMessage("Mobile browsers require HTTPS for camera access. Use an HTTPS tunnel or open the app on localhost.");
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setErrorMessage("This browser cannot access the camera from the current page.");
      return false;
    }
    setStatus("checking");
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: nextDeviceId
          ? { deviceId: { exact: nextDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(mediaDevices.filter((item) => item.kind === "videoinput"));
      setDeviceId(nextDeviceId);
      setStatus("ready");
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setStatus("permission-denied");
        setErrorMessage("Camera permission was blocked. Allow camera access in the browser permission prompt or site settings.");
        return false;
      }
      setStatus("unavailable");
      setErrorMessage(
        error instanceof DOMException && error.name === "NotFoundError"
          ? "No camera was found on this device."
          : error instanceof DOMException && error.name === "NotReadableError"
            ? "The camera is already in use by another app or browser tab."
            : "Camera could not be started on this device."
      );
      return false;
    }
  }, [stopCamera]);

  const captureFrame = useCallback((quality = 0.78) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement("canvas");
    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }, []);

  useEffect(() => {
    const cleanup = () => stopCamera();
    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      stopCamera();
    };
  }, [stopCamera]);

  return { videoRef, status, devices, deviceId, errorMessage, startCamera, stopCamera, captureFrame };
}
