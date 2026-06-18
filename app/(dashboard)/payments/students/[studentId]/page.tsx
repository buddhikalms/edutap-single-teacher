import { notFound } from "next/navigation";
import { StudentPaymentLedger, type StudentPaymentRow } from "@/components/payments/student-payment-ledger";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function StudentPaymentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { studentId } = await params;

  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { id: studentId, instituteId },
      include: {
        enrollments: { include: { classGroup: { include: { course: true } } } },
        payments: { include: { receipts: true }, orderBy: { createdAt: "desc" } }
      }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
  ]);

  if (!student) {
    notFound();
  }

  const payments: StudentPaymentRow[] = student.payments.map((payment) => ({
    id: payment.id,
    invoiceNo: payment.invoiceNo,
    type: payment.type,
    month: payment.month,
    amount: Number(payment.amount),
    discount: Number(payment.discount),
    paidAmount: Number(payment.paidAmount),
    balance: Number(payment.balance),
    status: payment.status,
    method: payment.method,
    dueDate: payment.dueDate.toLocaleDateString(),
    paidAt: payment.paidAt?.toLocaleString() ?? null,
    receiptIds: payment.receipts.map((receipt) => receipt.id)
  }));

  return (
    <StudentPaymentLedger
      student={{
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo
      }}
      classes={student.enrollments.map((enrollment) => ({
        id: enrollment.classGroup.id,
        name: `${enrollment.classGroup.name} · ${enrollment.classGroup.course.name}`,
        fee: Number(enrollment.classGroup.course.fee)
      }))}
      payments={payments}
      currency={settings?.currency ?? "USD"}
    />
  );
}
