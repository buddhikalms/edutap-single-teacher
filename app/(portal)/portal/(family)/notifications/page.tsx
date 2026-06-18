import Link from "next/link";
import { BellRing, CalendarCheck, CheckCircle2, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";

type ArrivalData = {
  studentName?: string;
  className?: string;
  branchName?: string;
  teacherName?: string | null;
  attendanceTime?: string;
  payment?: {
    pendingTotal?: number;
    overdueTotal?: number;
    nearestDueDate?: string | null;
    paymentStatus?: string;
    pendingItems?: Array<{ id: string; month: string | null; className: string | null; dueDate: string; balance: number; status: string }>;
  };
};

function formatMoney(value: number | undefined) {
  return `Rs. ${Math.round(value ?? 0).toLocaleString("en-US")}`;
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function PortalNotificationsPage() {
  const context = await getPortalContext();
  const notifications = await prisma.notification.findMany({
    where: {
      instituteId: context.instituteId,
      ...(context.parent
        ? { parentId: context.parent.id, OR: [{ studentId: null }, { studentId: { in: context.studentIds } }] }
        : { studentId: { in: context.studentIds } })
    },
    include: {
      student: { select: { firstName: true, lastName: true, admissionNo: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">Notifications</h2>
        <p className="mt-2 text-sm text-muted-foreground">Arrival confirmations, class alerts, and payment reminders for linked students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parent app inbox</CardTitle>
          <CardDescription>{notifications.length} notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-slate-50 py-16 text-center">
              <BellRing className="mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-semibold">No notifications yet</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">Attendance arrivals and payment-aware class alerts will appear here as soon as they are sent.</p>
            </div>
          ) : null}

          {notifications.map((notification) => {
            const data = (notification.dataJson ?? {}) as ArrivalData;
            const studentName = data.studentName ?? (notification.student ? `${notification.student.firstName} ${notification.student.lastName}` : "Student");
            const pendingTotal = data.payment?.pendingTotal ?? 0;
            const dueItems = data.payment?.pendingItems ?? [];

            return (
              <article key={notification.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={notification.status === "UNREAD" ? "default" : "secondary"}>{notification.status === "UNREAD" ? "Unread" : "Read"}</Badge>
                  <Badge variant="outline">{notification.type.replaceAll("_", " ")}</Badge>
                  {pendingTotal > 0 ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Payment due</Badge> : null}
                  <span className="text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</span>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{notification.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.body ?? notification.message}</p>

                    {notification.type === "STUDENT_ARRIVED" ? (
                      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-2">
                        <Detail label="Student" value={studentName} />
                        <Detail label="Class" value={data.className ?? "Class"} />
                        <Detail label="Attendance time" value={formatDateTime(data.attendanceTime)} />
                        <Detail label="Branch" value={data.branchName ?? "Branch"} />
                        <Detail label="Teacher" value={data.teacherName ?? "Teacher"} />
                        <Detail label="Payment status" value={data.payment?.paymentStatus ?? "PAID"} />
                        <Detail label="Pending total" value={formatMoney(pendingTotal)} />
                        <Detail label="Nearest due date" value={data.payment?.nearestDueDate ?? "No due date"} />
                      </div>
                    ) : null}

                    {dueItems.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {dueItems.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-sm">
                            <span className="font-semibold">{item.month ?? item.className ?? "Payment"}</span>
                            <span className="text-muted-foreground">Due {new Date(item.dueDate).toISOString().slice(0, 10)}</span>
                            <Badge variant="secondary">{formatMoney(item.balance)}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <Link href="/portal/payments">
                          <CreditCard className="h-4 w-4" />
                          View payments
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/portal/attendance">
                          <CalendarCheck className="h-4 w-4" />
                          View attendance
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
