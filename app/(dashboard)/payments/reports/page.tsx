import { CsvExportButton } from "@/components/payments/csv-export-button";
import { PaymentChart } from "@/components/payments/payment-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { csvEscape } from "@/lib/payments";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default async function PaymentReportsPage() {
  const { instituteId } = await getTenantContext();
  const { start, end } = todayRange();

  const [payments, settings] = await Promise.all([
    prisma.payment.findMany({
      where: { instituteId, status: { not: "CANCELLED" } },
      include: {
        student: true,
        classGroup: { include: { subject: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
  ]);
  const currency = settings?.currency ?? "USD";

  const daily = payments.filter((payment) => payment.paidAt && payment.paidAt >= start && payment.paidAt < end);
  const monthlyMap = new Map<string, number>();
  const classMap = new Map<string, number>();
  const studentDueMap = new Map<string, { name: string; admissionNo: string; due: number }>();

  for (const payment of payments) {
    const month = payment.month ?? (payment.paidAt ? monthKey(payment.paidAt) : "No month");
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + Number(payment.paidAmount));

    const className = payment.classGroup?.name ?? "General";
    classMap.set(className, (classMap.get(className) ?? 0) + Number(payment.paidAmount));

    if (Number(payment.balance) > 0 && payment.status !== "PAID") {
      const key = payment.studentId;
      const existing = studentDueMap.get(key) ?? {
        name: `${payment.student.firstName} ${payment.student.lastName}`,
        admissionNo: payment.student.admissionNo,
        due: 0
      };
      existing.due += Number(payment.balance);
      studentDueMap.set(key, existing);
    }
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, income]) => ({ month, income }));
  const classWise = Array.from(classMap.entries()).map(([className, income]) => ({ className, income }));
  const studentWiseDue = Array.from(studentDueMap.values()).sort((a, b) => b.due - a.due);
  const csv = [
    ["Invoice", "Student", "Class", "Month", "Type", "Amount", "Discount", "Paid", "Balance", "Status", "Method"].join(","),
    ...payments.map((payment) =>
      [
        payment.invoiceNo,
        `${payment.student.firstName} ${payment.student.lastName}`,
        payment.classGroup?.name ?? "General",
        payment.month ?? "",
        payment.type,
        payment.amount,
        payment.discount,
        payment.paidAmount,
        payment.balance,
        payment.status,
        payment.method ?? ""
      ]
        .map(csvEscape)
        .join(",")
    )
  ].join("\n");

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge variant="secondary">Finance reports</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Payment reports</h2>
            <p className="mt-2 text-sm text-muted-foreground">Daily collections, monthly income, class-wise income, and student-wise due reports.</p>
          </div>
          <CsvExportButton filename="edutap-payments.csv" csv={csv} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ReportMetric title="Daily collection" value={formatCurrency(daily.reduce((total, payment) => total + Number(payment.paidAmount), 0), currency)} />
        <ReportMetric title="Monthly income" value={formatCurrency(monthly.at(-1)?.income ?? 0, currency)} />
        <ReportMetric title="Student dues" value={formatCurrency(studentWiseDue.reduce((total, item) => total + item.due, 0), currency)} />
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Monthly income report</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentChart data={monthly.map((item) => ({ month: item.month, income: item.income }))} />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <ReportList title="Daily collection report" items={daily.map((payment) => ({
          label: `${payment.student.firstName} ${payment.student.lastName}`,
          detail: payment.invoiceNo,
          value: formatCurrency(payment.paidAmount.toString(), currency)
        }))} />
        <ReportList title="Class-wise income" items={classWise.map((item) => ({
          label: item.className,
          detail: "Collected",
          value: formatCurrency(item.income, currency)
        }))} />
        <ReportList title="Student-wise due report" items={studentWiseDue.map((item) => ({
          label: item.name,
          detail: item.admissionNo,
          value: formatCurrency(item.due, currency)
        }))} />
      </section>
    </div>
  );
}

function ReportMetric({ title, value }: { title: string; value: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportList({ title, items }: { title: string; items: Array<{ label: string; detail: string; value: string }> }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.slice(0, 10).map((item) => (
            <div key={`${item.label}-${item.detail}-${item.value}`} className="flex items-center justify-between gap-4 rounded-xl border bg-white/72 p-4">
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <p className="font-semibold">{item.value}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
            <p className="font-semibold">No data</p>
            <p className="mt-1 text-sm text-muted-foreground">Report data appears after collections are recorded.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
