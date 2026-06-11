import { apiRequest } from "@/api/client";
import type { BootstrapResponse, ClassRosterResponse, ScanResult, StudentProfileResponse } from "@/types/api";

export function getBootstrap() {
  return apiRequest<BootstrapResponse>("/api/mobile/bootstrap");
}

export function startAttendanceSession(classGroupId: string, sessionDate: string) {
  return apiRequest<{ ok: true; message: string; session: { id: string; classGroupId: string; sessionDate: string; startsAt?: string | null; status: string; markedCount: number } }>(
    "/api/mobile/attendance/session/start",
    {
      method: "POST",
      body: { classGroupId, sessionDate }
    }
  );
}

export function getClassRoster(classGroupId: string) {
  return apiRequest<ClassRosterResponse>(`/api/mobile/classes/${classGroupId}/students`);
}

export function markNfcAttendance(classGroupId: string, nfcUid: string, status = "PRESENT") {
  return apiRequest<ScanResult>("/api/attendance/nfc", {
    method: "POST",
    body: { classGroupId, nfcUid, status }
  });
}

export function markQrAttendance(classGroupId: string, token: string, status = "PRESENT") {
  return apiRequest<ScanResult>("/api/attendance/qr", {
    method: "POST",
    body: { classGroupId, token, status }
  });
}

export function saveManualAttendance(sessionId: string, records: Array<{ studentId: string; status: string; notes?: string }>) {
  return apiRequest<{ ok: true; message: string }>("/api/mobile/attendance/manual", {
    method: "POST",
    body: { sessionId, records }
  });
}

export function getStudentProfile(studentId: string) {
  return apiRequest<StudentProfileResponse>(`/api/mobile/students/${studentId}`);
}
