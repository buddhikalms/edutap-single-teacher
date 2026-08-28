import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CreditCard, Mail, Percent, Phone, UsersRound, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export default async function TeacherProfilePage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { teacherId } = await params;

  const [teacher, settings, payments] = await Promise.all([
    prisma.teacher.findFirst({
      where: { id: teacherId, instituteId },
      include: {
        branch: true,
        classGroups: {
          include: {
            subject: true,
            _count: { select: { enrollments: true } }
          },
          orderBy: { name: "asc" }
        }
      }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } }),
    prisma.payment.findMany({
      where: {
        instituteId,
        paidAmount: { gt: 0 },
        OR: [{ classGroup: { teacherId } }, { course: { teacherId } }]
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        classGroup: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } }
      },
      orderBy: { paidAt: "desc" }
    })
  ]);

  if (!teacher) {
    notFound();
  }

  const currency = settings?.currency ?? "LKR";
  const totalStudents = teacher.classGroups.reduce((total, classGroup) => total + classGroup._count.enrollments, 0);
  const grossRevenue = payments.reduce((total, payment) => total + Number(payment.paidAmount), 0);
  const commissionRate = Number(teacher.commissionRate);
  const commissionDue = grossRevenue * (commissionRate / 100);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/teachers">
            <ArrowLeft className="h-4 w-4" />
            Teachers
          </Link>
        </Button>
      </div>

      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Teacher profile</Badge>
            <h2 className="mt-4 text-3xl font-semibold">{teacher.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{teacher.specialty ?? "General faculty"} - {teacher.branch?.name ?? "Unassigned"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info icon={BookOpen} label="Classes" value={String(teacher.classGroups.length)} />
            <Info icon={UsersRound} label="Students" value={String(totalStudents)} />
            <Info icon={Wallet} label="Teacher revenue" value={formatCurrency(grossRevenue, currency)} />
            <Info icon={Percent} label="Commission" value={`${commissionRate}%`} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactLine icon={Mail} label="Email" value={teacher.email} />
              <ContactLine icon={Phone} label="Phone" value={teacher.phone ?? "Not added"} />
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Commission summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Summary label="Collected for teacher" value={formatCurrency(grossRevenue, currency)} />
              <Summary label="Institute commission" value={formatCurrency(commissionDue, currency)} />
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Assigned classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacher.classGroups.length ? (
              teacher.classGroups.map((classGroup) => (
                <Link key={classGroup.id} href={`/dashboard/classes/${classGroup.id}`} className="block rounded-xl border bg-white/70 p-4 transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{classGroup.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {classGroup.subject.name} - {classGroup.schedule}
                      </p>
                    </div>
                    <Badge variant="outline">{classGroup._count.enrollments} students</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
                <p className="font-semibold">No classes assigned</p>
                <p className="mt-1 text-sm text-muted-foreground">Assign classes from the teacher edit form.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Recent paid payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length ? (
            payments.slice(0, 20).map((payment) => (
              <div key={payment.id} className="grid gap-3 rounded-xl border bg-white/70 p-4 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-semibold">{payment.student.firstName} {payment.student.lastName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{payment.classGroup?.name ?? payment.course?.name ?? payment.invoiceNo}</p>
                </div>
                <Badge variant="outline">{payment.status.toLowerCase()}</Badge>
                <div className="font-semibold md:text-right">{formatCurrency(Number(payment.paidAmount), currency)}</div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No paid payments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ContactLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
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
