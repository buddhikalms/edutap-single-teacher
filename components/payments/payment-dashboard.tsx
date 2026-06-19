import Link from "next/link";
import { AlertTriangle, Banknote, CalendarDays, CreditCard, FileText, ReceiptText } from "lucide-react";
import { PaymentChart } from "@/components/payments/payment-chart";
import { PaymentStudentFinder } from "@/components/payments/payment-student-finder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export type PaymentDashboardData = {
  monthlyIncome: number;
  todayCollections: number;
  pendingPayments: number;
  overduePayments: number;
  chart: Array<{ month: string; income: number }>;
  recentPayments: Array<{
    id: string;
    receiptId: string | null;
    studentId: string;
    studentName: string;
    invoiceNo: string;
    status: string;
    paidAmount: number;
    balance: number;
    method: string | null;
    paidAt: string | null;
  }>;
  students: Array<{
    id: string;
    name: string;
    admissionNo: string;
    pending: number;
  }>;
};

export function PaymentDashboard({ data, currency }: { data: PaymentDashboardData; currency: string }) {
  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <Badge variant="secondary">Finance command center</Badge>
            <h2 className="mt-4 text-3xl font-semibold">Payments</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track collections, dues, receipts, and income reports with a polished workflow built for institute finance teams.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/payments/dues">
                <AlertTriangle className="h-4 w-4" />
                Due payments
              </Link>
            </Button>
            <Button asChild>
              <Link href="/payments/reports">
                <FileText className="h-4 w-4" />
                Reports
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceMetric title="Monthly income" value={formatCurrency(data.monthlyIncome, currency)} icon={Banknote} tone="navy" />
        <FinanceMetric title="Today collections" value={formatCurrency(data.todayCollections, currency)} icon={CalendarDays} tone="teal" />
        <FinanceMetric title="Pending payments" value={formatCurrency(data.pendingPayments, currency)} icon={CreditCard} tone="gold" />
        <FinanceMetric title="Overdue payments" value={formatCurrency(data.overduePayments, currency)} icon={AlertTriangle} tone="rose" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Payment chart</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentChart data={data.chart} />
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Find student to mark payment</CardTitle></CardHeader>
          <CardContent><PaymentStudentFinder students={data.students} currency={currency} /></CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentPayments.length ? (
            data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex flex-col justify-between gap-3 rounded-xl border bg-white/72 p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold">{payment.studentName}</p>
                  <p className="text-sm text-muted-foreground">{payment.invoiceNo} · {payment.method?.replaceAll("_", " ").toLowerCase() ?? "No method"}</p>
                </div>
                <div className="flex items-center gap-3 md:text-right">
                  <div>
                    <p className="font-semibold">{formatCurrency(payment.paidAmount, currency)}</p>
                    <p className="text-xs text-muted-foreground">balance {formatCurrency(payment.balance, currency)}</p>
                  </div>
                  <Badge variant={payment.status === "PAID" ? "success" : payment.status === "OVERDUE" ? "warning" : "outline"}>
                    {payment.status.toLowerCase()}
                  </Badge>
                  {payment.receiptId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/payments/receipts/${payment.receiptId}`}>
                        <ReceiptText className="h-4 w-4" />
                        Receipt
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <Empty title="No payments yet" text="Collections will appear here after payment records are created." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceMetric({ title, value, icon: Icon, tone }: { title: string; value: string; icon: typeof Banknote; tone: "navy" | "teal" | "gold" | "rose" }) {
  const tones = {
    navy: "bg-primary text-white",
    teal: "bg-teal-700 text-white",
    gold: "bg-accent text-accent-foreground",
    rose: "bg-rose-700 text-white"
  };

  return (
    <Card className="glass-panel">
      <CardContent className="p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
