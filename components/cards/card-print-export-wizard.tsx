"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Archive, CalendarDays, CheckCircle2, Download, FileSpreadsheet, FileText, GraduationCap, IdCard, Loader2, Nfc, Package, Printer, QrCode, Search, Send, Sparkles, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { CardPrintBatchStatus } from "@prisma/client";
import { generateCardPrintBatchAction, updateCardPrintBatchStatusAction } from "@/app/(dashboard)/dashboard/card-print-export/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { qrPayloadForToken } from "@/lib/card-print-export";

type Option = { id: string; name: string };

type StudentRow = {
  id: string;
  admissionNo: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
  parentMobile: string;
  emergencyContact: string;
  gradeIds: string[];
  gradeNames: string[];
  subjectIds: string[];
  subjectNames: string[];
  classIds: string[];
  classNames: string[];
  createdAt: string;
  cardStatus: string | null;
  cardNumber: string | null;
  qrToken: string | null;
  isReissueCandidate: boolean;
};

type BatchRow = {
  id: string;
  batchNumber: string;
  title: string;
  status: string;
  studentCount: number;
  exportedAt: string | null;
  createdAt: string;
};

type Props = {
  grades: Option[];
  subjects: Option[];
  classes: Option[];
  students: StudentRow[];
  batches: BatchRow[];
  instituteName: string;
};

type FilterMode = "ALL" | "WITHOUT_CARD" | "ACTIVE_CARD" | "NEW" | "REISSUE";

const steps = ["Select students", "Generate", "Preview", "Export", "Send to print"];

export function CardPrintExportWizard({ grades, subjects, classes, students, batches, instituteName }: Props) {
  const [openedAt] = useState(() => Date.now());
  const [step, setStep] = useState(0);
  const [gradeId, setGradeId] = useState("ALL");
  const [subjectId, setSubjectId] = useState("ALL");
  const [classId, setClassId] = useState("ALL");
  const [filter, setFilter] = useState<FilterMode>("ALL");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [prefix, setPrefix] = useState("EDU");
  const [cardNumberMode, setCardNumberMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [manualNumbers, setManualNumbers] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<{ id: string; batchNumber: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (gradeId !== "ALL" && !student.gradeIds.includes(gradeId)) return false;
      if (subjectId !== "ALL" && !student.subjectIds.includes(subjectId)) return false;
      if (classId !== "ALL" && !student.classIds.includes(classId)) return false;
      if (filter === "WITHOUT_CARD" && student.cardStatus) return false;
      if (filter === "ACTIVE_CARD" && student.cardStatus !== "ACTIVE") return false;
      if (filter === "NEW" && openedAt - new Date(student.createdAt).getTime() > 1000 * 60 * 60 * 24 * 30) return false;
      if (filter === "REISSUE" && !student.isReissueCandidate) return false;
      if (!needle) return true;
      return [student.name, student.admissionNo, student.phone, student.parentMobile].some((value) => value.toLowerCase().includes(needle));
    });
  }, [classId, filter, gradeId, openedAt, query, students, subjectId]);

  const selectedStudents = useMemo(() => students.filter((student) => selectedIds.includes(student.id)), [selectedIds, students]);
  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedIds.includes(student.id));

  function toggleStudent(studentId: string) {
    setSelectedIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  function toggleVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredStudents.some((student) => student.id === id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...filteredStudents.map((student) => student.id)])));
    }
  }

  function generateBatch() {
    startTransition(async () => {
      const result = await generateCardPrintBatchAction({ title, notes, studentIds: selectedIds, prefix, cardNumberMode, manualCardNumbers: manualNumbers });
      if (result.ok && result.batchId && result.batchNumber) {
        setBatch({ id: result.batchId, batchNumber: result.batchNumber });
        setStep(3);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function markSentToPrint() {
    if (!batch) return;
    startTransition(async () => {
      const result = await updateCardPrintBatchStatusAction(batch.id, CardPrintBatchStatus.SENT_TO_PRINT);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const exportHref = (format: string) => (batch ? `/api/card-print-export/batches/${batch.id}/export?format=${format}` : "#");

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge variant="secondary">NFC / QR print operations</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Student Card Print Export</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Build secure QR batches for physical card printing without exposing raw student IDs. Export Excel, CSV, QR ZIP, PDF sheets, and print-ready data.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Students" value={students.length} />
            <Metric label="Selected" value={selectedIds.length} tone="primary" />
            <Metric label="Batches" value={batches.length} />
          </div>
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 text-left text-sm transition ${step === index ? "border-primary bg-primary text-white shadow-glow" : "bg-white/80 hover:bg-white"}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === index ? "bg-white text-primary" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
            <span className="font-semibold">{label}</span>
          </button>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          {step === 0 ? (
            <Card className="glass-panel">
              <CardContent className="p-5">
                <div className="grid gap-3 lg:grid-cols-5">
                  <Select value={gradeId} onChange={(event) => setGradeId(event.target.value)}><option value="ALL">All grades</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</Select>
                  <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="ALL">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select>
                  <Select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="ALL">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
                  <Select value={filter} onChange={(event) => setFilter(event.target.value as FilterMode)}>
                    <option value="ALL">All students</option>
                    <option value="WITHOUT_CARD">Students without card</option>
                    <option value="ACTIVE_CARD">Students with active card</option>
                    <option value="NEW">Newly registered students</option>
                    <option value="REISSUE">Reissue card students</option>
                  </Select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, mobile" className="pl-9" />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-3 text-sm font-semibold">
                    <Checkbox checked={allVisibleSelected} onChange={toggleVisible} />
                    Select visible students ({filteredStudents.length})
                  </label>
                  <Button onClick={() => setStep(1)} disabled={!selectedIds.length}>Continue</Button>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border bg-white/70">
                  <div className="max-h-[34rem] overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <label key={student.id} className="grid cursor-pointer gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/40 sm:grid-cols-[1.5rem_minmax(0,1fr)_8rem_10rem] sm:items-center">
                        <Checkbox checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{student.name}</span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">{student.admissionNo} - {student.classNames.join(", ") || "No active class"}</span>
                        </span>
                        <Badge variant={student.cardStatus === "ACTIVE" ? "success" : student.isReissueCandidate ? "warning" : "outline"}>{student.cardStatus?.toLowerCase().replaceAll("_", " ") || "no card"}</Badge>
                        <span className="truncate text-xs text-muted-foreground">{student.parentMobile || student.phone || "No mobile"}</span>
                      </label>
                    ))}
                    {!filteredStudents.length ? <p className="p-8 text-center text-sm text-muted-foreground">No students match the current filters.</p> : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card className="glass-panel">
              <CardContent className="space-y-5 p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Batch title"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="July card print batch" /></Field>
                  <Field label="Card number mode"><Select value={cardNumberMode} onChange={(event) => setCardNumberMode(event.target.value as "AUTO" | "MANUAL")}><option value="AUTO">Auto-generate card numbers</option><option value="MANUAL">Manual card numbers</option></Select></Field>
                  <Field label="Prefix setting"><Input value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="EDU" disabled={cardNumberMode === "MANUAL"} /></Field>
                  <Field label="Notes"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Printer, delivery notes, or card stock details" /></Field>
                </div>

                {cardNumberMode === "MANUAL" ? (
                  <div className="rounded-xl border bg-white/75 p-4">
                    <p className="font-semibold">Manual card numbers</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {selectedStudents.map((student) => (
                        <Field key={student.id} label={`${student.name} (${student.admissionNo})`}>
                          <Input value={manualNumbers[student.id] ?? ""} onChange={(event) => setManualNumbers((current) => ({ ...current, [student.id]: event.target.value }))} placeholder="EDU-000001" />
                        </Field>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-between gap-3">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button onClick={() => setStep(2)} disabled={!selectedIds.length}>Preview cards</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card className="glass-panel">
              <CardContent className="p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  {selectedStudents.slice(0, 6).map((student, index) => {
                    const previewToken = student.qrToken || `EDUTAP-PREVIEW-${student.admissionNo}`;
                    const cardNo = cardNumberMode === "MANUAL" ? manualNumbers[student.id] || "Manual pending" : student.cardNumber || `${prefix || "EDU"}-${String(index + 1).padStart(6, "0")}`;
                    return <PreviewCard key={student.id} student={student} cardNo={cardNo} token={previewToken} instituteName={instituteName} />;
                  })}
                </div>
                {selectedStudents.length > 6 ? <p className="mt-4 text-sm text-muted-foreground">Showing 6 of {selectedStudents.length} selected card sets.</p> : null}
                <div className="mt-5 flex justify-between gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={generateBatch} disabled={pending || !selectedIds.length}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate secure QR batch</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step >= 3 ? (
            <Card className="glass-panel">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <Badge variant={batch ? "success" : "outline"}>{batch ? batch.batchNumber : "No generated batch"}</Badge>
                    <h3 className="mt-3 text-xl font-semibold">Export files</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Downloads are enabled after generating the batch.</p>
                  </div>
                  <Button onClick={markSentToPrint} disabled={!batch || pending}><Send className="h-4 w-4" /> Mark as sent to print</Button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <DownloadButton href={exportHref("xlsx")} disabled={!batch} icon={FileSpreadsheet} label="Excel" />
                  <DownloadButton href={exportHref("csv")} disabled={!batch} icon={FileText} label="CSV" />
                  <DownloadButton href={exportHref("zip")} disabled={!batch} icon={Archive} label="QR ZIP" />
                  <DownloadButton href={exportHref("pdf")} disabled={!batch} icon={Printer} label="PDF sheet" />
                  <DownloadButton href={exportHref("json")} disabled={!batch} icon={Package} label="Print-ready data" />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card className="glass-panel">
            <CardContent className="p-5">
              <p className="flex items-center gap-2 font-semibold"><UsersRound className="h-4 w-4 text-primary" /> Batch summary</p>
              <div className="mt-4 space-y-3 text-sm">
                <Summary label="Selected students" value={String(selectedIds.length)} />
                <Summary label="Card numbers" value={cardNumberMode === "AUTO" ? `Auto / ${prefix || "EDU"}` : "Manual"} />
                <Summary label="QR security" value="Random token URL" />
                <Summary label="Current batch" value={batch?.batchNumber ?? "Not generated"} />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardContent className="p-5">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" /> Export history</p>
              <div className="mt-4 space-y-3">
                {batches.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border bg-white/75 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate font-semibold">{item.batchNumber}</p><p className="truncate text-xs text-muted-foreground">{item.title}</p></div>
                      <Badge variant={item.status === "SENT_TO_PRINT" ? "success" : "outline"}>{item.status.toLowerCase().replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.studentCount} students - {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
                {!batches.length ? <p className="text-sm text-muted-foreground">No export batches yet.</p> : null}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "primary" }) {
  return <div className={`rounded-xl border bg-white/75 p-4 ${tone === "primary" ? "border-primary/25" : ""}`}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-semibold">{value}</span></div>;
}

function PreviewCard({ student, cardNo, token, instituteName }: { student: StudentRow; cardNo: string; token: string; instituteName: string }) {
  const initials = student.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const enrolledOn = new Date(student.createdAt);
  const validThrough = new Date(enrolledOn);
  validThrough.setFullYear(validThrough.getFullYear() + 1);
  const date = (value: Date) => value.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const course = student.classNames[0] || student.subjectNames[0] || student.gradeNames[0] || "Student";

  return (
    <div className="rounded-2xl border bg-slate-100/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{student.name}</p>
          <p className="text-xs text-muted-foreground">Front and back print preview</p>
        </div>
        <Badge variant="outline">{cardNo}</Badge>
      </div>

      <div className="grid justify-center gap-5 md:grid-cols-2">
        <article className="relative aspect-[0.63/1] w-full max-w-[280px] overflow-hidden rounded-[20px] border border-slate-200 bg-white text-[#0b2140] shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 opacity-50 [background:radial-gradient(ellipse_at_top_right,rgba(212,157,50,.15),transparent_56%),repeating-radial-gradient(ellipse_at_top,transparent_0,transparent_8px,rgba(15,35,65,.055)_9px,transparent_10px)]" />
          <div className="relative flex h-full flex-col px-5 pt-5">
            <CardBrand instituteName={instituteName} dark={false} />

            <div className="mt-5 grid grid-cols-[5.7rem_minmax(0,1fr)] gap-4">
              <div className="relative h-36 overflow-hidden rounded-[16px] border-2 border-[#c9912d] bg-slate-100 shadow-sm">
                {student.avatarUrl ? (
                  <Image src={student.avatarUrl} alt={student.name} fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 text-2xl font-bold text-primary">{initials}</div>
                )}
              </div>
              <div className="min-w-0 pt-1">
                <h4 className="break-words text-lg font-extrabold uppercase leading-5 tracking-tight">{student.name}</h4>
                <div className="mt-2 h-px w-full bg-gradient-to-r from-[#c9912d] to-transparent" />
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b57d1c]">Student</p>
                <CardDetail icon={IdCard} label="ID No." value={student.admissionNo} />
                <CardDetail icon={CalendarDays} label="Enrolled" value={date(enrolledOn)} />
                <CardDetail icon={GraduationCap} label="Course" value={course} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px]">
              <CalendarDays className="h-4 w-4 text-[#b57d1c]" />
              <span className="text-slate-500">Valid through</span>
              <span className="ml-auto font-bold">{date(validThrough)}</span>
            </div>

            <div className="relative -mx-5 mt-auto flex h-[5.8rem] items-center overflow-hidden bg-[#082342] px-6 text-white">
              <div className="absolute -top-8 right-[-2rem] h-20 w-64 rotate-[-8deg] rounded-[50%] border-[10px] border-[#d9a33d]" />
              <Nfc className="relative h-8 w-8" />
              <div className="relative ml-3">
                <p className="text-sm font-bold">NFC SMART CARD</p>
                <p className="text-[9px] tracking-[0.16em] text-white/65">TAP TO CONNECT</p>
              </div>
            </div>
          </div>
        </article>

        <article className="relative aspect-[0.63/1] w-full max-w-[280px] overflow-hidden rounded-[20px] border border-[#17385c] bg-[#082342] text-white shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(36,77,119,.72),transparent_42%),linear-gradient(145deg,transparent_65%,rgba(212,157,50,.17)_65%,transparent_68%)]" />
          <div className="pointer-events-none absolute -left-16 top-32 h-64 w-24 rotate-[-18deg] rounded-[50%] border border-white/10" />
          <div className="pointer-events-none absolute -right-16 top-28 h-72 w-28 rotate-[18deg] rounded-[50%] border border-white/10" />
          <div className="relative flex h-full flex-col items-center px-5 pt-6">
            <CardBrand instituteName={instituteName} dark />
            <div className="mt-5 rounded-[15px] border-2 border-[#d6a33f] bg-white p-2 shadow-lg">
              <QRCodeSVG value={qrPayloadForToken(token)} size={126} level="M" fgColor="#06172b" />
            </div>
            <p className="mt-4 text-center text-xs font-semibold uppercase leading-5 tracking-[0.1em]">Scan to verify<br />or tap the card</p>
            <div className="mt-3 h-px w-16 bg-[#d6a33f]" />
            <div className="mt-auto w-[calc(100%+2.5rem)] border-t border-[#d6a33f]/80 bg-[#061c36]/80 px-5 py-4">
              <div className="flex items-center justify-center gap-2 text-[10px] text-white/75">
                <QrCode className="h-3.5 w-3.5 text-[#d6a33f]" />
                <span className="truncate">{cardNo}</span>
              </div>
              <p className="mt-1 text-center text-[9px] text-white/50">Secure student identity • {instituteName}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function CardBrand({ instituteName, dark }: { instituteName: string; dark: boolean }) {
  const initials = instituteName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`flex h-12 w-12 items-center justify-center rounded-b-[18px] rounded-t-md border-2 font-serif text-lg font-bold ${dark ? "border-[#d6a33f] bg-[#0a294e] text-white" : "border-[#c9912d] bg-[#0b2c50] text-white"}`}>
        <span>{initials}</span>
      </div>
      <p className={`mt-2 max-w-[14rem] text-[11px] font-bold uppercase tracking-[0.13em] ${dark ? "text-white" : "text-[#0b2140]"}`}>{instituteName}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-px w-7 bg-[#c9912d]" />
        <GraduationCap className="h-3.5 w-3.5 text-[#c9912d]" />
        <span className="h-px w-7 bg-[#c9912d]" />
      </div>
    </div>
  );
}

function CardDetail({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string }) {
  return (
    <div className="mt-2 flex min-w-0 items-start gap-1.5 text-[9px] leading-3">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0b2c50]" />
      <span className="min-w-0">
        <span className="block text-slate-500">{label}</span>
        <span className="block break-words font-semibold text-[#0b2140]">{value}</span>
      </span>
    </div>
  );
}

function DownloadButton({ href, disabled, icon: Icon, label }: { href: string; disabled: boolean; icon: typeof Download; label: string }) {
  if (disabled) {
    return <Button type="button" variant="outline" disabled className="h-16 flex-col"><Icon className="h-5 w-5" />{label}</Button>;
  }
  return <Button asChild variant="outline" className="h-16 flex-col"><a href={href}><Icon className="h-5 w-5" />{label}</a></Button>;
}
