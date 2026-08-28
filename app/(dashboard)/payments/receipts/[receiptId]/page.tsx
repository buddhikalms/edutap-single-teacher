import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { PrintButton } from "@/components/payments/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { receiptId } = await params;

  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, instituteId },
    include: {
      institute: { include: { settings: true } },
      payment: {
        include: {
          student: { include: { branch: true } },
          classGroup: { include: { subject: true } }
        }
      }
    }
  });

  if (!receipt) {
    notFound();
  }

  const payment = receipt.payment;
  const student = payment.student;
  const currency = receipt.institute.settings?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body { background: white !important; }
          header, aside, .no-print { display: none !important; }
          .receipt-wrap { box-shadow: none !important; border: none !important; width: 100% !important; }
          .receipt-paper { max-width: 794px; margin: 0 auto; }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      <div className="no-print flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <Button asChild variant="outline">
          <Link href="/payments">
            <ArrowLeft className="h-4 w-4" />
            Payments
          </Link>
        </Button>
        <PrintButton />
      </div>

      <Card className="receipt-wrap glass-panel mx-auto max-w-3xl">
        <CardContent className="receipt-paper p-8">
          <div className="flex items-start justify-between gap-6 border-b pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white">
                {receipt.institute.logoUrl ? <img src={receipt.institute.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8" />}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{receipt.institute.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{receipt.institute.address ?? "Institute address"}</p>
                <p className="text-sm text-muted-foreground">{receipt.institute.phone ?? receipt.institute.email}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="success">Receipt</Badge>
              <p className="mt-3 text-xl font-semibold">{receipt.receiptNo}</p>
              <p className="text-sm text-muted-foreground">{receipt.issuedAt.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-6 border-b py-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Received from</p>
              <p className="mt-2 text-lg font-semibold">{student.firstName} {student.lastName}</p>
              <p className="text-sm text-muted-foreground">{student.admissionNo} · {student.branch.name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Payment details</p>
              <p className="mt-2 text-lg font-semibold">{payment.invoiceNo}</p>
              <p className="text-sm text-muted-foreground">
                {payment.type.replaceAll("_", " ").toLowerCase()} · {payment.month ?? "No month"}
              </p>
            </div>
          </div>

          <div className="py-6">
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <tbody>
                  <ReceiptRow label="Class / course" value={payment.classGroup ? `${payment.classGroup.name} · ${payment.classGroup.subject.name}` : "General payment"} />
                  <ReceiptRow label="Amount" value={formatCurrency(payment.amount.toString(), currency)} />
                  <ReceiptRow label="Discount" value={formatCurrency(payment.discount.toString(), currency)} />
                  <ReceiptRow label="Paid on this receipt" value={formatCurrency(receipt.amount.toString(), currency)} />
                  <ReceiptRow label="Total paid" value={formatCurrency(payment.paidAmount.toString(), currency)} />
                  <ReceiptRow label="Balance" value={formatCurrency(payment.balance.toString(), currency)} />
                  <ReceiptRow label="Method" value={payment.method?.replaceAll("_", " ").toLowerCase() ?? "Not recorded"} />
                  <ReceiptRow label="Received by" value={receipt.receivedBy ?? payment.receivedBy ?? "EduTap"} />
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 pt-8 md:grid-cols-2">
            <div className="rounded-xl border border-dashed p-4">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-2 text-sm">{payment.note ?? "Thank you for your payment."}</p>
            </div>
            <div className="rounded-xl border border-dashed p-4 text-right">
              <p className="text-xs text-muted-foreground">Authorized signature</p>
              <div className="mt-10 border-t pt-2 text-sm">EduTap</div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            This receipt is generated by EduTap and is valid without a physical stamp unless required by the institute.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="bg-muted/50 px-4 py-3 font-medium text-muted-foreground">{label}</td>
      <td className="px-4 py-3 text-right font-semibold">{value}</td>
    </tr>
  );
}
