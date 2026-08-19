"use client";

export function FaceGuideOverlay({ state }: { state: "idle" | "good" | "warning" | "error" | "processing" }) {
  const color = state === "good" ? "border-emerald-400" : state === "error" ? "border-red-400" : state === "processing" ? "border-sky-400" : "border-amber-300";
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className={`h-[78%] max-h-[25rem] min-h-72 w-[66%] max-w-80 min-w-56 rounded-[45%] border-4 ${color} shadow-[0_0_0_999px_rgba(0,0,0,0.28)]`} />
    </div>
  );
}
