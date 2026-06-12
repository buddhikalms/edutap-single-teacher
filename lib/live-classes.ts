import type { LiveClassAccessType, LiveClassStatus } from "@prisma/client";

export function liveClassWindow(input: { startTime: Date; durationMinutes: number }) {
  return new Date(input.startTime.getTime() + input.durationMinutes * 60_000);
}

export function liveClassRuntimeStatus(input: { status: LiveClassStatus; startTime: Date; endTime: Date }) {
  const now = new Date();

  if (input.status === "CANCELLED") return "cancelled";
  if (input.status === "DRAFT") return "draft";
  if (now >= input.startTime && now <= input.endTime) return "live";
  if (now > input.endTime || input.status === "COMPLETED") return "completed";
  return "upcoming";
}

export function providerLabel(provider: string) {
  return provider
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function selectedStudentIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

export function isAssignedToStudent(liveClass: { targetStudentIds: unknown }, studentId: string) {
  const targets = selectedStudentIds(liveClass.targetStudentIds);
  return !targets.length || targets.includes(studentId);
}

export function isLiveClassLocked(input: { accessType: LiveClassAccessType; price: unknown }) {
  return input.accessType === "PAID" && Number(input.price) > 0;
}
