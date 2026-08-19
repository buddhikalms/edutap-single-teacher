"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  QrCode,
  Radio,
  Send,
  Search,
  ScanLine,
  ScanFace,
  ShieldAlert,
  UsersRound
} from "lucide-react";
import { toast } from "sonner";
import { endAttendanceSession, startAttendanceSession } from "@/app/(dashboard)/attendance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceMarkResult } from "@/lib/attendance";
import type { AttendanceSessionStatus, AttendanceSource, AttendanceStatus } from "@prisma/client";

type Status = AttendanceStatus;

export type AttendanceStudent = {
  id: string;
  name: string;
  admissionNo: string;
  nfcUid: string | null;
  attendanceToken: string;
  paymentLabel: string;
  paymentStatus: "clear" | "pending" | "overdue" | "partial";
};

export type AttendanceRecordView = {
  id: string;
  studentId: string;
  status: Status;
  source: AttendanceSource;
  markedAt: string;
};

export type AttendanceSessionView = {
  id: string;
  classGroupId: string;
  className: string;
  branchName: string;
  teacherName: string;
  sessionDate: string;
  status: AttendanceSessionStatus;
  startsAt: string | null;
  endsAt: string | null;
  classEndNotificationCount: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  records: AttendanceRecordView[];
};

export type AttendanceClass = {
  id: string;
  name: string;
  branchId: string;
  branch: string;
  classType: string;
  course: string;
  teacher: string;
  students: AttendanceStudent[];
  activeSession: AttendanceSessionView | null;
};

export type AttendanceAudit = {
  id: string;
  studentName: string;
  className: string;
  source: AttendanceSource;
  status: Status | null;
  success: boolean;
  message: string;
  createdAt: string;
};

export type AttendanceReport = {
  daily: AttendanceSessionView[];
  classWise: Array<{ className: string; total: number; present: number; late: number; absent: number; excused: number; rate: number }>;
  studentWise: Array<{ studentId: string; studentName: string; admissionNo: string; total: number; present: number; late: number; absent: number; excused: number; rate: number }>;
};

type AttendanceSearchStudent = {
  id: string;
  name: string;
  admissionNo: string;
  phone: string | null;
  nfcUid: string | null;
  status: string;
};

type WebNfcReadingEvent = Event & {
  serialNumber?: string;
};

type WebNfcReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((event: WebNfcReadingEvent) => void) | null;
  onreadingerror: (() => void) | null;
};

type WebNfcWindow = Window & {
  NDEFReader?: new () => WebNfcReader;
};

export function AttendanceTerminal({
  classes,
  sessions,
  audits,
  reports
}: {
  classes: AttendanceClass[];
  sessions: AttendanceSessionView[];
  audits: AttendanceAudit[];
  reports: AttendanceReport;
}) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedBranchId, setSelectedBranchId] = useState(classes[0]?.branchId ?? "");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [nfcUid, setNfcUid] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [manualStatus, setManualStatus] = useState<Status>("PRESENT");
  const [searchResults, setSearchResults] = useState<AttendanceSearchStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AttendanceSearchStudent | null>(null);
  const [feedback, setFeedback] = useState<AttendanceMarkResult | null>(null);
  const [recent, setRecent] = useState<AttendanceMarkResult[]>([]);
  const [webNfcStatus, setWebNfcStatus] = useState("Waiting for an active session.");
  const [isPending, startTransition] = useTransition();
  const [isScanning, startScanTransition] = useTransition();
  const [isSearching, startSearchTransition] = useTransition();
  const [isSendingClassOver, startClassOverTransition] = useTransition();
  const webNfcAbortRef = useRef<AbortController | null>(null);
  const webNfcRestartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webNfcPostingRef = useRef(false);
  const lastWebNfcReadRef = useRef<{ uid: string; at: number } | null>(null);
  const router = useRouter();

  const branchOptions = useMemo(
    () => Array.from(new Map(classes.map((classGroup) => [classGroup.branchId, { id: classGroup.branchId, name: classGroup.branch }])).values()),
    [classes]
  );
  const filteredClasses = useMemo(
    () => classes.filter((classGroup) => !selectedBranchId || classGroup.branchId === selectedBranchId),
    [classes, selectedBranchId]
  );
  const selectedClass = filteredClasses.find((classGroup) => classGroup.id === selectedClassId) ?? filteredClasses[0] ?? classes[0];
  const activeSession = selectedClass?.activeSession ?? null;
  const canScan = activeSession?.status === "ACTIVE";
  const postScan = useCallback(
    async (endpoint: "nfc" | "qr", payload: Record<string, string>) => {
      const response = await fetch(`/api/attendance/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroupId: selectedClass?.id,
          status: "PRESENT",
          scanId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          deviceId: "dashboard-terminal",
          scanType: endpoint === "nfc" ? "NFC" : "QR",
          scannedValue: payload.nfcUid ?? payload.token ?? "",
          timestamp: new Date().toISOString(),
          ...payload
        })
      });
      const result = (await response.json()) as AttendanceMarkResult;
      setFeedback(result);
      setRecent((current) => [result, ...current].slice(0, 8));

      if (result.ok) {
        toast.success(result.message);
        setNfcUid("");
        setQrToken("");
      } else {
        toast.error(result.message);
      }
    },
    [selectedClass?.id]
  );

  useEffect(() => {
    return () => {
      webNfcAbortRef.current?.abort();
      if (webNfcRestartRef.current) {
        clearTimeout(webNfcRestartRef.current);
      }
    };
  }, []);

  useEffect(() => {
    webNfcAbortRef.current?.abort();
    if (webNfcRestartRef.current) {
      clearTimeout(webNfcRestartRef.current);
    }

    const updateStatus = (message: string) => {
      queueMicrotask(() => setWebNfcStatus(message));
    };

    if (!canScan || !selectedClass?.id) {
      updateStatus("Start an attendance session to listen for cards.");
      return;
    }

    const nfcWindow = window as WebNfcWindow;
    if (!nfcWindow.NDEFReader) {
      updateStatus("Web NFC is not available in this browser. Use Chrome on Android or enter the UID manually.");
      return;
    }

    let stopped = false;

    async function startReader() {
      if (stopped || webNfcPostingRef.current || !nfcWindow.NDEFReader) return;

      const controller = new AbortController();
      webNfcAbortRef.current = controller;
      const reader = new nfcWindow.NDEFReader();

      reader.onreading = (event) => {
        const uid = event.serialNumber?.trim();
        if (!uid || webNfcPostingRef.current) return;

        const now = Date.now();
        if (lastWebNfcReadRef.current?.uid === uid && now - lastWebNfcReadRef.current.at < 2500) {
          setWebNfcStatus("Same card ignored for a moment.");
          return;
        }

        lastWebNfcReadRef.current = { uid, at: now };
        webNfcPostingRef.current = true;
        controller.abort();
        setNfcUid(uid);
        setWebNfcStatus(`Read ${uid}. Marking attendance...`);

        void postScan("nfc", { nfcUid: uid })
          .finally(() => {
            webNfcPostingRef.current = false;
            if (!stopped) {
              setWebNfcStatus("Ready for the next card.");
              webNfcRestartRef.current = setTimeout(() => {
                void startReader();
              }, 450);
            }
          });
      };

      reader.onreadingerror = () => {
        setWebNfcStatus("Could not read that card. Hold it near the reader again.");
      };

      try {
        await reader.scan({ signal: controller.signal });
        setWebNfcStatus("NFC reader is listening. Tap a student card.");
      } catch (error) {
        if (!stopped && !(error instanceof DOMException && error.name === "AbortError")) {
          setWebNfcStatus(error instanceof Error ? error.message : "Could not start the NFC reader.");
        }
      }
    }

    void startReader();

    return () => {
      stopped = true;
      webNfcAbortRef.current?.abort();
      if (webNfcRestartRef.current) {
        clearTimeout(webNfcRestartRef.current);
      }
    };
  }, [activeSession?.id, canScan, postScan, selectedClass?.id]);

  function startSession() {
    if (!selectedClass) {
      toast.error("Select a class first.");
      return;
    }

    startTransition(async () => {
      const result = await startAttendanceSession({
        classGroupId: selectedClass.id,
        sessionDate,
        sessionType: "INHOUSE",
        notes
      });
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function endSession() {
    if (!activeSession) {
      toast.error("No active session to end.");
      return;
    }

    startTransition(async () => {
      const result = await endAttendanceSession(activeSession.id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function sendClassOverNotification() {
    if (!activeSession || activeSession.status !== "ENDED") {
      toast.error("End the class before sending class over notifications.");
      return;
    }

    startClassOverTransition(async () => {
      const response = await fetch(`/api/attendance-sessions/${activeSession.id}/send-class-ended-notification`, {
        method: "POST"
      });
      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        sentCount?: number;
        skippedDuplicates?: number;
        failedCount?: number;
      };

      if (!response.ok || !payload.ok) {
        toast.error(payload.message ?? "Could not send class over notifications.");
        return;
      }

      if ((payload.sentCount ?? 0) > 0) {
        toast.success(`Class over notifications sent to ${payload.sentCount} parent${payload.sentCount === 1 ? "" : "s"}.`);
      } else {
        toast.info(payload.message ?? "Class over notification already sent.");
      }

      router.refresh();
    });
  }

  async function searchEnrolledStudents() {
    if (!selectedClass || !manualQuery.trim()) {
      toast.error("Select a class and enter student ID, name, phone, or card number.");
      return;
    }

    startSearchTransition(async () => {
      const response = await fetch("/api/attendance/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroupId: selectedClass.id,
          query: manualQuery.trim(),
          method: "MANUAL_SEARCH"
        })
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; students?: AttendanceSearchStudent[] };

      if (!response.ok || !payload.ok) {
        toast.error(payload.message ?? "Could not search students.");
        setSearchResults([]);
        setSelectedStudent(null);
        return;
      }

      setSearchResults(payload.students ?? []);
      setSelectedStudent(payload.students?.[0] ?? null);
      if (!payload.students?.length) {
        toast.error("No active enrolled students matched that search.");
      }
    });
  }

  async function markManualStudent(student = selectedStudent, status = manualStatus) {
    if (!selectedClass || !student) {
      toast.error("Select a student first.");
      return;
    }

    startScanTransition(async () => {
      const response = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classGroupId: selectedClass.id,
          studentId: student.id,
          status,
          method: "MANUAL_SEARCH"
        })
      });
      const result = (await response.json()) as AttendanceMarkResult;
      setFeedback(result);
      setRecent((current) => [result, ...current].slice(0, 8));

      if (result.ok) {
        toast.success(result.message);
        setManualQuery("");
        setSearchResults([]);
        setSelectedStudent(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  function scanNfc() {
    if (!selectedClass || !nfcUid.trim()) {
      toast.error("Select a class and enter an NFC UID.");
      return;
    }

    startScanTransition(() => {
      void postScan("nfc", { nfcUid: nfcUid.trim() });
    });
  }

  function scanQr() {
    if (!selectedClass || !qrToken.trim()) {
      toast.error("Select a class and enter a QR token.");
      return;
    }

    startScanTransition(() => {
      void postScan("qr", { token: qrToken.trim() });
    });
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <Badge variant="secondary">Attendance command center</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Attendance Terminal</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Start sessions, scan NFC/QR credentials, edit manual attendance, and review reporting without leaving the dashboard.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MiniMetric icon={CalendarCheck2} label="Sessions" value={String(sessions.length)} />
            <MiniMetric icon={UsersRound} label="Class students" value={String(selectedClass?.students.length ?? 0)} />
            <MiniMetric icon={ScanLine} label="Recent scans" value={String(audits.length)} />
          </div>
        </div>
        <div className="mt-5">
          <Button asChild variant="outline">
            <Link href="/attendance/face">
              <ScanFace className="h-4 w-4" />
              Open Face Kiosk
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Session controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Branch / location</span>
                <Select
                  value={selectedBranchId}
                  onChange={(event) => {
                    const nextBranchId = event.target.value;
                    const nextClass = classes.find((classGroup) => classGroup.branchId === nextBranchId);
                    setSelectedBranchId(nextBranchId);
                    setSelectedClassId(nextClass?.id ?? "");
                  }}
                >
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Class</span>
                <Select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                  {filteredClasses.map((classGroup) => (
                    <option key={classGroup.id} value={classGroup.id}>
                      {classGroup.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Date</span>
                <Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Session notes</span>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional session note" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <Button onClick={startSession} disabled={isPending || !selectedClass}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
                Start attendance session
              </Button>
              <Button variant="outline" onClick={endSession} disabled={isPending || !activeSession || activeSession.status !== "ACTIVE"}>
                <Clock className="h-4 w-4" />
                End Class
              </Button>
            </div>
            <ActiveSessionCard session={activeSession} />
            {activeSession?.status === "ENDED" ? (
              <Button
                className="w-full"
                variant={activeSession.classEndNotificationCount > 0 ? "outline" : "default"}
                onClick={sendClassOverNotification}
                disabled={isSendingClassOver || activeSession.classEndNotificationCount > 0}
              >
                {isSendingClassOver ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {activeSession.classEndNotificationCount > 0 ? "Already sent" : "Send Class Over Notification"}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Search-first scanner terminal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-xl border bg-white/72 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-teal-700" />
                  <p className="font-semibold">NFC reader</p>
                </div>
                <p className="mb-3 rounded-lg border bg-white/80 px-3 py-2 text-xs font-semibold text-muted-foreground">{webNfcStatus}</p>
                <div className="flex gap-2">
                  <Input value={nfcUid} onChange={(event) => setNfcUid(event.target.value)} placeholder="Tap or enter NFC UID" />
                  <Button onClick={scanNfc} disabled={isScanning || !canScan}>
                    {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                    Mark
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-white/72 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <p className="font-semibold">QR scan placeholder</p>
                </div>
                <div className="flex gap-2">
                  <Input value={qrToken} onChange={(event) => setQrToken(event.target.value)} placeholder="Paste scanned secure token" />
                  <Button variant="outline" onClick={scanQr} disabled={isScanning || !canScan}>
                    <QrCode className="h-4 w-4" />
                    Scan
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-white/72 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Manual student search</p>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    value={manualQuery}
                    onChange={(event) => setManualQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        searchEnrolledStudents();
                      }
                    }}
                    placeholder="Student ID, name, phone, or card number"
                  />
                  <Button variant="outline" onClick={searchEnrolledStudents} disabled={isSearching || !canScan}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
                {searchResults.length ? (
                  <div className="mt-3 space-y-2">
                    {searchResults.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selectedStudent?.id === student.id ? "border-primary bg-primary/5" : "bg-white/80 hover:bg-muted/50"
                        }`}
                      >
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.admissionNo} - {student.phone ?? "No phone"} - {student.nfcUid ?? "No card"}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
                {selectedStudent ? (
                  <div className="mt-4 rounded-xl border bg-white/80 p-3">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-semibold">{selectedStudent.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedStudent.admissionNo}</p>
                      </div>
                      <Select value={manualStatus} onChange={(event) => setManualStatus(event.target.value as Status)} className="md:w-[150px]">
                        <option value="PRESENT">Present</option>
                        <option value="LATE">Late</option>
                        <option value="EXCUSED">Excused</option>
                      </Select>
                    </div>
                    <Button className="mt-3 w-full" onClick={() => markManualStudent()} disabled={isScanning || !canScan}>
                      Mark selected student
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <FeedbackCard feedback={feedback} />
          </CardContent>
        </Card>
      </section>

      <RecentScansCard recent={recent} audits={audits} />

      <ReportsCard reports={reports} />
    </div>
  );
}

function ActiveSessionCard({ session }: { session: AttendanceSessionView | null }) {
  if (!session) {
    return (
      <div className="rounded-xl border border-dashed bg-white/60 p-5 text-center">
        <p className="font-semibold">No active session</p>
        <p className="mt-1 text-sm text-muted-foreground">Start a session before NFC, QR, or manual attendance.</p>
      </div>
    );
  }

  const isEnded = session.status === "ENDED";

  return (
    <div className={`rounded-xl border p-5 ${isEnded ? "bg-slate-50 text-slate-950" : "bg-emerald-50 text-emerald-950"}`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Class Status</p>
          <h3 className="mt-1 text-lg font-semibold">{session.className}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{session.branchName}</p>
          <p className="mt-1 text-sm text-muted-foreground">Teacher: {session.teacherName}</p>
        </div>
        <Badge variant={isEnded ? "secondary" : "success"}>{isEnded ? "ended" : "active"}</Badge>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <TimeDetail label="Started" value={session.startsAt ? new Date(session.startsAt).toLocaleTimeString() : "Not recorded"} />
        <TimeDetail label="Ended" value={session.endsAt ? new Date(session.endsAt).toLocaleTimeString() : "Not ended"} />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
        <StatPill label="Present" value={session.present} />
        <StatPill label="Late" value={session.late} />
        <StatPill label="Absent" value={session.absent} />
        <StatPill label="Excused" value={session.excused} />
      </div>
      {isEnded && session.classEndNotificationCount > 0 ? (
        <p className="mt-4 rounded-lg border bg-white/80 px-3 py-2 text-sm font-semibold text-muted-foreground">
          Class over notification already sent.
        </p>
      ) : null}
    </div>
  );
}

function TimeDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function RecentScansCard({ recent, audits }: { recent: AttendanceMarkResult[]; audits: AttendanceAudit[] }) {
  const list = recent.length
    ? recent.map((item, index) => ({
        id: `${item.student?.id ?? item.message}-${index}`,
        title: item.student?.name ?? "Unknown credential",
        detail: item.payment?.label ?? item.message,
        success: item.ok,
        source: item.source ?? "NFC",
        createdAt: item.markedAt ? new Date(item.markedAt).toLocaleTimeString() : "now"
      }))
    : audits.map((audit) => ({
        id: audit.id,
        title: audit.studentName,
        detail: audit.message,
        success: audit.success,
        source: audit.source,
        createdAt: audit.createdAt
      }));

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Recent scanned students</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length ? (
          list.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border bg-white/72 p-4">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <div className="text-right">
                <Badge variant={item.success ? "success" : "warning"}>{String(item.source).toLowerCase()}</Badge>
                <p className="mt-2 text-xs text-muted-foreground">{item.createdAt}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
            <p className="font-semibold">No scans yet</p>
            <p className="mt-1 text-sm text-muted-foreground">NFC and QR activity will appear here instantly.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeedbackCard({ feedback }: { feedback: AttendanceMarkResult | null }) {
  if (!feedback) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed bg-white/60 p-6 text-center">
        <ScanLine className="h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-semibold">Waiting for scan</p>
        <p className="mt-1 text-sm text-muted-foreground">Result, payment status, and marked time appear here.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-[220px] rounded-xl border p-6 ${feedback.ok ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}>
      <div className="flex items-start gap-3">
        {feedback.ok ? <CheckCircle2 className="h-7 w-7 text-emerald-700" /> : <ShieldAlert className="h-7 w-7 text-amber-700" />}
        <div>
          <p className="text-lg font-semibold">{feedback.ok ? "Attendance marked" : "Attention needed"}</p>
          <p className="mt-1 text-sm">{feedback.message}</p>
        </div>
      </div>
      {feedback.student ? (
        <div className="mt-6 space-y-3">
          <p className="text-2xl font-semibold">{feedback.student.name}</p>
          <p className="text-sm">{feedback.student.admissionNo} - {feedback.status?.toLowerCase()}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={feedback.payment?.status === "clear" ? "success" : "warning"}>
              <CreditCard className="mr-1 h-3 w-3" />
              {feedback.payment?.label ?? "Payment unknown"}
            </Badge>
            <Badge variant="outline">{feedback.markedAt ? new Date(feedback.markedAt).toLocaleTimeString() : "not saved"}</Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportsCard({ reports }: { reports: AttendanceReport }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Attendance reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ReportSection title="Daily attendance">
          {reports.daily.slice(0, 4).map((session) => (
            <ReportLine key={session.id} label={session.className} detail={session.sessionDate} value={`${session.present}/${session.total}`} />
          ))}
        </ReportSection>
        <ReportSection title="Class-wise attendance">
          {reports.classWise.slice(0, 5).map((item) => (
            <ReportLine key={item.className} label={item.className} detail={`${item.total} marks`} value={`${item.rate}%`} />
          ))}
        </ReportSection>
        <ReportSection title="Student-wise attendance">
          {reports.studentWise.slice(0, 5).map((item) => (
            <ReportLine key={item.studentId} label={item.studentName} detail={item.admissionNo} value={`${item.rate}%`} />
          ))}
        </ReportSection>
      </CardContent>
    </Card>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {children || <p className="rounded-xl border border-dashed bg-white/60 p-4 text-sm text-muted-foreground">No data yet.</p>}
      </div>
    </div>
  );
}

function ReportLine({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-white/72 p-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof CalendarCheck2; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/70 p-2">
      <p className="font-semibold">{value}</p>
      <p className="text-xs text-emerald-800">{label}</p>
    </div>
  );
}

