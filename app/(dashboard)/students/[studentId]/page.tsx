import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck2, CreditCard, GraduationCap, IdCard, QrCode, Radio, UserRound } from "lucide-react";
import { StudentQrCode } from "@/components/students/student-qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export default async function StudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { studentId } = await params;

  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        branch: true,
        parents: true,
        payments: { orderBy: { dueDate: "desc" }, take: 6 },
        attendance: { include: { session: { include: { classGroup: true } } }, orderBy: { markedAt: "desc" }, take: 8 },
        cards: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { issuedAt: "desc" }
        },
        enrollments: {
          include: {
            classGroup: {
              include: {
                subject: true,
                teacher: true
              }
            }
          }
        }
      }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
  ]);

  if (!student) {
    notFound();
  }

  const pending = student.payments.filter((payment) => payment.status !== "PAID" && payment.status !== "CANCELLED");
  const paid = student.payments.filter((payment) => payment.status === "PAID");
  const currency = settings?.currency ?? "USD";
  const activeCard = student.cards[0];
  const qrToken = activeCard?.qrToken ?? activeCard?.qrCode ?? student.attendanceToken ?? "token-pending";
  const attendanceRate =
    student.attendance.length === 0
      ? 0
      : Math.round((student.attendance.filter((record) => record.status === "PRESENT").length / student.attendance.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/students">
              <ArrowLeft className="h-4 w-4" />
              Students
            </Link>
          </Button>
          <h2 className="mt-4 text-3xl font-semibold">{student.firstName} {student.lastName}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{student.admissionNo} · {student.branch.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/students/${student.id}/cards`}>
              <IdCard className="h-4 w-4" />
              Manage cards
            </Link>
          </Button>
          <Badge variant={student.status === "ACTIVE" ? "success" : "outline"}>{student.status.toLowerCase()}</Badge>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary text-white shadow-glow">
                {student.avatarUrl ? <span className="text-sm font-semibold">Photo</span> : <UserRound className="h-16 w-16" />}
              </div>
              <h3 className="mt-5 text-xl font-semibold">{student.firstName} {student.lastName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{student.email ?? "No email added"}</p>
            </div>
            <div className="mt-6 grid gap-3">
              <InfoLine icon={IdCard} label="Phone" value={student.phone ?? "Not added"} />
              <InfoLine icon={IdCard} label="Card number" value={activeCard?.cardNumber ?? "Not assigned"} />
              <InfoLine icon={Radio} label="NFC UID" value={activeCard?.nfcUid ?? student.nfcUid ?? "Not assigned"} />
              <InfoLine icon={QrCode} label="QR code" value={activeCard?.qrCode ?? student.qrCode ?? "Not assigned"} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="Assigned classes" value={String(student.enrollments.length)} icon={GraduationCap} />
            <SummaryCard title="Attendance" value={`${attendanceRate}%`} icon={CalendarCheck2} />
            <SummaryCard
              title="Pending fees"
              value={formatCurrency(pending.reduce((total, payment) => total + Number(payment.amount), 0), currency)}
              icon={CreditCard}
            />
          </div>
          <Card className="glass-panel">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="rounded-xl border bg-white p-3">
                <StudentQrCode token={qrToken} />
              </div>
              <div>
                <Badge variant="outline">Secure attendance QR</Badge>
                <p className="mt-3 font-semibold">QR token</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">{qrToken}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Parent / guardian details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.parents.length ? (
              student.parents.map((parent) => (
                <div key={parent.id} className="rounded-xl border bg-white/70 p-4">
                  <p className="font-semibold">{parent.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{parent.phone}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{parent.email ?? "No email"} · {parent.occupation ?? "Occupation not added"}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No guardian linked" text="Add guardian information from the edit student form." />
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Assigned classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.enrollments.length ? (
              student.enrollments.map((enrollment) => (
                <Link key={enrollment.id} href={`/dashboard/classes/${enrollment.classGroup.id}`} className="block rounded-xl border bg-white/70 p-4 transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{enrollment.classGroup.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {enrollment.classGroup.subject.name ?? enrollment.classGroup.subject.name} · {enrollment.classGroup.teacher?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <Badge variant={enrollment.active ? "success" : "outline"}>{enrollment.active ? "active" : "inactive"}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No classes assigned" text="Use Enrollment to assign this student to a class." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white/70 p-4">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(paid.reduce((total, payment) => total + Number(payment.amount), 0), currency)}</p>
              </div>
              <div className="rounded-xl border bg-white/70 p-4">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(pending.reduce((total, payment) => total + Number(payment.amount), 0), currency)}</p>
              </div>
            </div>
            {student.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border bg-white/70 p-4">
                <div>
                  <p className="font-semibold">{payment.invoiceNo}</p>
                  <p className="text-sm text-muted-foreground">{payment.dueDate.toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(payment.amount.toString(), currency)}</p>
                  <Badge variant={payment.status === "PAID" ? "success" : "warning"}>{payment.status.toLowerCase()}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Attendance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {student.attendance.length ? (
              student.attendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between rounded-xl border bg-white/70 p-4">
                  <div>
                    <p className="font-semibold">{record.session.classGroup.name}</p>
                    <p className="text-sm text-muted-foreground">{record.markedAt.toLocaleDateString()}</p>
                  </div>
                  <Badge variant={record.status === "PRESENT" ? "success" : record.status === "LATE" ? "warning" : "outline"}>
                    {record.status.toLowerCase()}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState title="No attendance yet" text="Attendance records will appear after sessions are marked." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof GraduationCap }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
