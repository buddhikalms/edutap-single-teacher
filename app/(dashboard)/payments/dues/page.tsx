import { DuePaymentsManager, type DueRow } from "@/components/payments/due-payments-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DuePaymentsPage() {
  const { instituteId } = await getTenantContext();
  const month = currentMonth();
  const now = new Date();

  const [classes, payments] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId },
      include: {
        course: true,
        enrollments: {
          where: { active: true },
          include: { student: true }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.payment.findMany({
      where: { instituteId, type: "MONTHLY_FEE" },
      include: { receipts: { orderBy: { issuedAt: "desc" }, take: 1 } }
    })
  ]);

  const paymentMap = new Map(payments.map((payment) => [`${payment.studentId}:${payment.classGroupId}:${payment.month}`, payment]));
  const rows: DueRow[] = [];

  for (const classGroup of classes) {
    for (const enrollment of classGroup.enrollments) {
      const key = `${enrollment.studentId}:${classGroup.id}:${month}`;
      const existingPayment = paymentMap.get(key);
      const payment = existingPayment?.status === "CANCELLED" ? undefined : existingPayment;
      const fee = Number(classGroup.course.fee);
      const balance = payment ? Number(payment.balance) : fee;
      const dueDate = new Date(`${month}-10T00:00:00.000`);
      const status = payment
        ? (payment.status as "PENDING" | "PAID" | "PARTIAL" | "OVERDUE")
        : dueDate < now
          ? "OVERDUE"
          : "PENDING";

      rows.push({
        key,
        studentId: enrollment.student.id,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        admissionNo: enrollment.student.admissionNo,
        nfcUid: enrollment.student.nfcUid,
        attendanceToken: enrollment.student.attendanceToken,
        classGroupId: classGroup.id,
        className: classGroup.name,
        month,
        fee,
        paidAmount: payment ? Number(payment.paidAmount) : 0,
        discount: payment ? Number(payment.discount) : 0,
        balance,
        status,
        dueDate: dueDate.toLocaleDateString(),
        receiptId: payment?.receipts[0]?.id ?? null
      });
    }
  }

  return <DuePaymentsManager rows={rows} classes={classes.map((classGroup) => ({ id: classGroup.id, name: classGroup.name }))} month={month} />;
}
