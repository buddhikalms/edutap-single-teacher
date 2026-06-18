import Link from "next/link";
import { CreditCard, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

function paymentBadge(status: string) {
  if (status === "PAID") return "success";
  if (status === "PARTIAL" || status === "PENDING") return "warning";
  return "outline";
}

export default async function PortalPaymentsPage() {
  const context = await getPortalContext();
  const payments = await prisma.payment.findMany({
    where: { studentId: { in: context.studentIds } },
    orderBy: { createdAt: "desc" },
    include: {
      student: true,
      classGroup: true,
      receipts: { orderBy: { issuedAt: "desc" } }
    }
  });

  const pendingAmount = payments
    .filter((payment) => ["PENDING", "PARTIAL", "OVERDUE"].includes(payment.status))
    .reduce((total, payment) => total + Number(payment.balance), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div>
          <h2 className="text-2xl font-bold tracking-normal">Payments</h2>
          <p className="mt-2 text-sm text-muted-foreground">History, balances, due dates, and downloadable receipts.</p>
        </div>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending amount</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(pendingAmount, context.currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>{payments.length} payments found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CreditCard className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">No payments yet</p>
            </div>
          ) : null}
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{payment.invoiceNo}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.student.firstName} {payment.student.lastName} · {payment.classGroup?.name ?? "General"} · {payment.month ?? payment.type}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Due {payment.dueDate.toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={paymentBadge(payment.status)}>{payment.status}</Badge>
                  <Badge variant="outline">Balance {formatCurrency(Number(payment.balance), context.currency)}</Badge>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline">Amount {formatCurrency(Number(payment.amount), context.currency)}</Badge>
                <Badge variant="outline">Paid {formatCurrency(Number(payment.paidAmount), context.currency)}</Badge>
                {payment.receipts.map((receipt) => (
                  <Button key={receipt.id} asChild variant="outline" size="sm">
                    <Link href={`/portal/receipts/${receipt.id}`}>
                      <Download className="h-4 w-4" />
                      Receipt {receipt.receiptNo}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
