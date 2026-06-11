"use client";

import { useMemo, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  QrCode,
  Radio,
  ScanLine,
  ShieldAlert,
  UsersRound
} from "lucide-react";
import { toast } from "sonner";
import { endAttendanceSession, saveManualAttendance, startAttendanceSession } from "@/app/(dashboard)/attendance/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AttendanceMarkResult } from "@/lib/attendance";
import type { AttendanceSource } from "@prisma/client";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

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
  sessionDate: string;
  status: "ACTIVE" | "ENDED";
  startsAt: string | null;
  endsAt: string | null;
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
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [nfcUid, setNfcUid] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [feedback, setFeedback] = useState<AttendanceMarkResult | null>(null);
  const [recent, setRecent] = useState<AttendanceMarkResult[]>([]);
  const [manualRecords, setManualRecords] = useState<Record<string, Status>>({});
  const [manualNotes, setManualNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [isScanning, startScanTransition] = useTransition();

  const selectedClass = classes.find((classGroup) => classGroup.id === selectedClassId) ?? classes[0];
  const activeSession = selectedClass?.activeSession ?? null;
  const existingStatusByStudent = useMemo(() => {
    const map = new Map<string, Status>();
    activeSession?.records.forEach((record) => map.set(record.studentId, record.status));
    return map;
  }, [activeSession]);

  function startSession() {
    if (!selectedClass) {
      toast.error("Select a class first.");
      return;
    }

    startTransition(async () => {
      const result = await startAttendanceSession({
        classGroupId: selectedClass.id,
        sessionDate,
        notes
      });
      if (result.ok) {
        toast.success(result.message);
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
      } else {
        toast.error(result.message);
      }
    });
  }

  async function postScan(endpoint: "nfc" | "qr", payload: Record<string, string>) {
    const response = await fetch(`/api/attendance/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classGroupId: selectedClass?.id,
        status: "PRESENT",
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

  function markAllPresent() {
    if (!selectedClass) {
      return;
    }

    setManualRecords(Object.fromEntries(selectedClass.students.map((student) => [student.id, "PRESENT"])));
  }

  function saveManual() {
    if (!activeSession || !selectedClass) {
      toast.error("Start an active session before saving manual attendance.");
      return;
    }

    const records = selectedClass.students.map((student) => ({
      studentId: student.id,
      status: manualRecords[student.id] ?? existingStatusByStudent.get(student.id) ?? "ABSENT",
      notes: manualNotes[student.id]
    }));

    startTransition(async () => {
      const result = await saveManualAttendance({
        sessionId: activeSession.id,
        records
      });
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Session controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Class</span>
                <Select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                  {classes.map((classGroup) => (
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
              <Button variant="outline" onClick={endSession} disabled={isPending || !activeSession}>
                <Clock className="h-4 w-4" />
                End session
              </Button>
            </div>
            <ActiveSessionCard session={activeSession} />
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Scanner terminal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-xl border bg-white/72 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-teal-700" />
                  <p className="font-semibold">NFC scan simulator</p>
                </div>
                <div className="flex gap-2">
                  <Input value={nfcUid} onChange={(event) => setNfcUid(event.target.value)} placeholder="Tap or enter NFC UID" />
                  <Button onClick={scanNfc} disabled={isScanning || !activeSession}>
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
                  <Button variant="outline" onClick={scanQr} disabled={isScanning || !activeSession}>
                    <QrCode className="h-4 w-4" />
                    Scan
                  </Button>
                </div>
              </div>
            </div>
            <FeedbackCard feedback={feedback} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <ManualAttendanceCard
          selectedClass={selectedClass}
          activeSession={activeSession}
          existingStatusByStudent={existingStatusByStudent}
          manualRecords={manualRecords}
          manualNotes={manualNotes}
          setManualRecords={setManualRecords}
          setManualNotes={setManualNotes}
          markAllPresent={markAllPresent}
          saveManual={saveManual}
          isPending={isPending}
        />
        <RecentScansCard recent={recent} audits={audits} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <QrRosterCard selectedClass={selectedClass} />
        <ReportsCard reports={reports} />
      </section>
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

  return (
    <div className="rounded-xl border bg-emerald-50 p-5 text-emerald-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Active session</p>
          <p className="mt-1 text-sm text-emerald-800">{session.className} · {session.sessionDate}</p>
        </div>
        <Badge variant="success">active</Badge>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
        <StatPill label="Present" value={session.present} />
        <StatPill label="Late" value={session.late} />
        <StatPill label="Absent" value={session.absent} />
        <StatPill label="Excused" value={session.excused} />
      </div>
    </div>
  );
}

function ManualAttendanceCard({
  selectedClass,
  activeSession,
  existingStatusByStudent,
  manualRecords,
  manualNotes,
  setManualRecords,
  setManualNotes,
  markAllPresent,
  saveManual,
  isPending
}: {
  selectedClass?: AttendanceClass;
  activeSession: AttendanceSessionView | null;
  existingStatusByStudent: Map<string, Status>;
  manualRecords: Record<string, Status>;
  manualNotes: Record<string, string>;
  setManualRecords: React.Dispatch<React.SetStateAction<Record<string, Status>>>;
  setManualNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  markAllPresent: () => void;
  saveManual: () => void;
  isPending: boolean;
}) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <CardTitle>Manual attendance</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!activeSession}>
              Bulk mark all present
            </Button>
            <Button size="sm" onClick={saveManual} disabled={!activeSession || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save attendance
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedClass?.students.length ? (
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {selectedClass.students.map((student) => {
              const selectedStatus = manualRecords[student.id] ?? existingStatusByStudent.get(student.id) ?? "ABSENT";
              return (
                <div key={student.id} className="rounded-xl border bg-white/72 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-semibold">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.admissionNo} · {student.paymentLabel}</p>
                    </div>
                    <Select
                      value={selectedStatus}
                      onChange={(event) =>
                        setManualRecords((current) => ({ ...current, [student.id]: event.target.value as Status }))
                      }
                      className="md:w-[150px]"
                    >
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="LATE">Late</option>
                      <option value="EXCUSED">Excused</option>
                    </Select>
                  </div>
                  <Input
                    className="mt-3"
                    placeholder="Optional note"
                    value={manualNotes[student.id] ?? ""}
                    onChange={(event) => setManualNotes((current) => ({ ...current, [student.id]: event.target.value }))}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
            <p className="font-semibold">No enrolled students</p>
            <p className="mt-1 text-sm text-muted-foreground">Enroll students before marking attendance.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QrRosterCard({ selectedClass }: { selectedClass?: AttendanceClass }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Student QR codes</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedClass?.students.length ? (
          <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {selectedClass.students.map((student) => (
              <div key={student.id} className="rounded-xl border bg-white/72 p-4">
                <div className="flex gap-4">
                  <div className="flex h-[106px] w-[106px] items-center justify-center rounded-lg border bg-white p-2">
                    {student.attendanceToken ? (
                      <QRCodeSVG value={student.attendanceToken} size={88} level="M" />
                    ) : (
                      <span className="text-center text-xs text-muted-foreground">Token pending</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{student.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{student.admissionNo}</p>
                    <p className="mt-3 break-all text-xs text-muted-foreground">{student.attendanceToken}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
            <p className="font-semibold">No QR codes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Students assigned to this class will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
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
          <p className="text-sm">{feedback.student.admissionNo} · {feedback.status?.toLowerCase()}</p>
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
