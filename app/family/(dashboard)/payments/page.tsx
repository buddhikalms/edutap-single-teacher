import Link from "next/link";
import { Download } from "lucide-react";
import { PaymentSlipResubmitForm } from "@/components/payments/payment-slip-resubmit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyPaymentsPage() {
  const { selectedStudent: student, currency, userId } = await getFamilyContext();
  const [payments, slips] = await Promise.all([
    prisma.payment.findMany({
      where: { studentId: student.id },
      include: { classGroup: true, receipts: { orderBy: { issuedAt: "desc" } }, paymentSlip: true },
      orderBy: { dueDate: "desc" },
      take: 100
    }),
    prisma.enrollmentPaymentSlip.findMany({
      where: { familyUserId: userId, studentId: student.id },
      include: { enrollmentRequest: { include: { classGroup: true } }, payment: { include: { receipts: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-semibold">Payments · {student.firstName}</h2><p className="mt-1 text-sm text-muted-foreground">Payment history, uploaded slips, review status, and receipts.</p></div>

    {slips.length ? <section className="space-y-3"><h3 className="font-semibold">Uploaded payment slips</h3>{slips.map((slip) => <article key={slip.id} className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{slip.enrollmentRequest.classGroup.name}</p><p className="text-sm text-muted-foreground">{slip.fileName} · paid {slip.paymentDate.toISOString().slice(0, 10)}</p></div><Badge variant={slip.status === "VERIFIED" ? "success" : slip.status === "PENDING_REVIEW" ? "warning" : "outline"}>{slip.status.replaceAll("_", " ")}</Badge></div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="outline">{currency} {Number(slip.paidAmount).toLocaleString()}</Badge><Button asChild size="sm" variant="outline"><a href={`${slip.fileUrl}?download=1`}><Download className="h-4 w-4" />Slip</a></Button>
        {slip.payment?.receipts.map((receipt) => <Button key={receipt.id} asChild size="sm" variant="outline"><Link href={`/portal/receipts/${receipt.id}`}>Receipt {receipt.receiptNo}</Link></Button>)}
      </div>
      {slip.teacherNote ? <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm"><span className="font-semibold">Teacher note:</span> {slip.teacherNote}</p> : null}
      {slip.status === "REJECTED" ? <PaymentSlipResubmitForm enrollmentRequestId={slip.enrollmentRequestId} paidAmount={Number(slip.paidAmount)} paymentMethod={slip.paymentMethod} paymentDate={slip.paymentDate.toISOString().slice(0, 10)} referenceNumber={slip.referenceNumber || ""} /> : null}
    </article>)}</section> : null}

    <section className="space-y-3"><h3 className="font-semibold">Payment history</h3>{payments.length ? payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-3 rounded-2xl border bg-white p-4">
      <div><p className="font-semibold">{payment.classGroup?.name ?? payment.invoiceNo}</p><p className="text-sm text-muted-foreground">Due {payment.dueDate.toISOString().slice(0, 10)} · {payment.invoiceNo}</p>
        <div className="mt-2 flex flex-wrap gap-2">{payment.receipts.map((receipt) => <Button key={receipt.id} asChild size="sm" variant="outline"><Link href={`/portal/receipts/${receipt.id}`}>View receipt {receipt.receiptNo}</Link></Button>)}</div>
      </div>
      <div className="text-right"><p className="font-semibold">{currency} {Number(payment.balance).toLocaleString()}</p><Badge variant={payment.status === "PAID" ? "success" : "warning"}>{payment.status}</Badge></div>
    </div>) : <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">No payment records yet.</div>}</section>
  </div>;
}
