import { notFound } from "next/navigation";
import { DownloadPdfButton, PrintButton, SharePdfButton, WhatsAppShareButton } from "@/components/payments/print-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

type ReceiptPageProps = {
  params: Promise<{ receiptId: string }>;
};

export default async function PortalReceiptPage({ params }: ReceiptPageProps) {
  const { receiptId } = await params;
  const context = await getPortalContext();
  const receipt = await prisma.receipt.findFirst({
    where: {
      id: receiptId,
      instituteId: context.instituteId,
      payment: { studentId: { in: context.studentIds } }
    },
    include: {
      institute: true,
      payment: {
        include: {
          student: true,
          course: true,
          classGroup: { include: { subject: true } }
        }
      }
    }
  });

  if (!receipt) {
    notFound();
  }

  const studentName = `${receipt.payment.student.firstName} ${receipt.payment.student.lastName}`.trim();
  const shareText = `Invoice ${receipt.payment.invoiceNo} / Receipt ${receipt.receiptNo} for ${studentName}: ${formatCurrency(Number(receipt.amount), context.currency)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="no-print flex flex-wrap justify-end gap-2">
        <DownloadPdfButton receiptId={receipt.id} />
        <SharePdfButton receiptId={receipt.id} text={shareText} />
        <WhatsAppShareButton text={shareText} />
        <PrintButton />
      </div>
      <Card data-print-root className="print:shadow-none">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">Receipt</p>
              <h1 className="mt-2 text-3xl font-bold">{receipt.receiptNo}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{receipt.issuedAt.toLocaleString()}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-bold">{receipt.institute.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{receipt.institute.address}</p>
              <p className="text-sm text-muted-foreground">{receipt.institute.phone}</p>
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Student</p>
              <p className="mt-1 font-semibold">
                {studentName}
              </p>
              <p className="text-sm text-muted-foreground">{receipt.payment.student.admissionNo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="mt-1 font-semibold">{receipt.payment.classGroup?.name ?? "General payment"}</p>
              <p className="text-sm text-muted-foreground">{receipt.payment.classGroup?.subject.name ?? receipt.payment.course?.name ?? receipt.payment.type}</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/30 p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-semibold">Invoice</span>
              <span>{receipt.payment.invoiceNo}</span>
            </div>
            <div className="flex items-center justify-between border-b py-3">
              <span className="font-semibold">Payment type</span>
              <span>{receipt.payment.type}</span>
            </div>
            <div className="flex items-center justify-between border-b py-3">
              <span className="font-semibold">Method</span>
              <span>{receipt.payment.method ?? "Not recorded"}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-lg font-bold">Amount received</span>
              <span className="text-2xl font-bold">{formatCurrency(Number(receipt.amount), context.currency)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Badge variant="success">Paid</Badge>
            <p className="text-sm text-muted-foreground">Received by {receipt.receivedBy ?? receipt.payment.receivedBy ?? "EduTap staff"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
